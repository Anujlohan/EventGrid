const mongoose = require('mongoose');
const AppError = require('./appError');

const MAX_TRANSACTION_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 50;

/**
 * Retries commitTransaction if UnknownTransactionCommitResult occurs
 * per MongoDB Transaction Retry Specification
 */
const commitWithRetry = async (session) => {
  let commitAttempt = 0;
  while (commitAttempt < MAX_TRANSACTION_RETRIES) {
    try {
      await session.commitTransaction();
      return;
    } catch (error) {
      commitAttempt++;
      const isUnknownCommit =
        error.hasErrorLabel && error.hasErrorLabel('UnknownTransactionCommitResult');

      if (!isUnknownCommit || commitAttempt >= MAX_TRANSACTION_RETRIES) {
        throw error;
      }
      // Brief delay before retrying commit
      await new Promise((res) => setTimeout(res, 30 * commitAttempt));
    }
  }
};

/**
 * Executes an operation inside a MongoDB ACID transaction with bounded retries
 * - Retries transaction on TransientTransactionError
 * - Retries commit on UnknownTransactionCommitResult
 * - Fails immediately on deterministic business/validation errors
 * - Guarantees session cleanup in finally block
 *
 * @param {Function} operationFn - Async function receiving (session)
 * @returns {Promise<any>} Result of operationFn
 */
const runTransactionWithRetry = async (operationFn) => {
  let attempt = 0;

  while (attempt < MAX_TRANSACTION_RETRIES) {
    attempt++;
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const result = await operationFn(session);

      // Commit transaction with dedicated commit retry loop
      await commitWithRetry(session);

      return result;
    } catch (error) {
      // Abort transaction on any error
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        // Suppress abort errors if session already aborted/ended
      }

      const isTransient =
        error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError');

      // Only transient write conflict errors are eligible for full transaction retry
      if (!isTransient || attempt >= MAX_TRANSACTION_RETRIES) {
        if (isTransient) {
          throw new AppError(
            'Server is currently experiencing high contention. Please try again.',
            503
          );
        }
        throw error;
      }

      // Exponential backoff with random jitter before retrying transaction
      const jitter = Math.random() * 30;
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt) + jitter;
      await new Promise((res) => setTimeout(res, delay));
    } finally {
      try {
        await session.endSession();
      } catch (endErr) {
        // Suppress session end errors
      }
    }
  }
};

module.exports = {
  runTransactionWithRetry,
};
