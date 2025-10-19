import { Types } from "mongoose";

/**
 * Validates if a string is a valid MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

/**
 * Safely creates an ObjectId from a string
 * @param id - The string to convert to ObjectId
 * @throws Error if the id is not a valid ObjectId
 */
export function toObjectId(id: string): Types.ObjectId {
  if (!isValidObjectId(id)) {
    const { getMessage } = require('../constants/messages');
    const AppError = require('../errors/AppError').default;
    throw new AppError(getMessage('VALIDATION.INVALID_OBJECT_ID') + `: ${id}`, 400);
  }
  return new Types.ObjectId(id);
}

/**
 * Safely converts any ID (string or ObjectId) to string format
 */
export function toStringId(id: string | Types.ObjectId): string {
  return id.toString();
}

/**
 * Safely converts any ID (string or ObjectId) to ObjectId format
 * This function handles both string IDs and existing ObjectIds safely
 */
export function ensureObjectId(id: string | Types.ObjectId | any): Types.ObjectId {
  // If it's already an ObjectId, return it as-is
  if (id instanceof Types.ObjectId) {
    return id;
  }
  
  // If it's a string, validate and convert
  if (typeof id === 'string') {
    return toObjectId(id);
  }
  
  // If it's an object with toString method (like a mongoose document _id)
  if (id && typeof id.toString === 'function') {
    const stringId = id.toString();
    return toObjectId(stringId);
  }
  
  const { getMessage } = require('../constants/messages');
  const AppError = require('../errors/AppError').default;
  throw new AppError(getMessage('VALIDATION.CANNOT_CONVERT_TO_OBJECT_ID') + `: ${typeof id} ${id}`, 400);
}

/**
 * Validates and converts an array of string IDs to ObjectIds
 */
export function toObjectIds(ids: string[]): Types.ObjectId[] {
  return ids.map(id => toObjectId(id));
}

/**
 * Checks if two ObjectIds or string IDs are equal
 */
export function areIdsEqual(id1: string | Types.ObjectId, id2: string | Types.ObjectId): boolean {
  return id1.toString() === id2.toString();
}