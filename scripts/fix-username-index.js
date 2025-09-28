#!/usr/bin/env node

// Script to fix the username index issue in MongoDB

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg_db';

async function fixUsernameIndex() {
  let client;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const collection = db.collection('users');
    
    console.log('📋 Listing current indexes...');
    const indexes = await collection.listIndexes().toArray();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));
    
    // Check if username index exists
    const usernameIndex = indexes.find(idx => idx.key.username !== undefined);
    
    if (usernameIndex) {
      console.log('❌ Found problematic username index:', usernameIndex.name);
      console.log('🗑️ Dropping username index...');
      
      await collection.dropIndex(usernameIndex.name);
      console.log('✅ Successfully dropped username index');
    } else {
      console.log('✅ No username index found - this is good!');
    }
    
    // List indexes after cleanup
    const finalIndexes = await collection.listIndexes().toArray();
    console.log('📋 Final indexes:', finalIndexes.map(idx => ({ name: idx.name, key: idx.key })));
    
    // Check for documents with null username to understand the issue better
    console.log('🔍 Checking for documents with username field...');
    const docsWithUsername = await collection.find({ username: { $exists: true } }).toArray();
    console.log(`Found ${docsWithUsername.length} documents with username field`);
    
    if (docsWithUsername.length > 0) {
      console.log('🧹 Removing username field from existing documents...');
      await collection.updateMany({}, { $unset: { username: "" } });
      console.log('✅ Removed username field from all documents');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

fixUsernameIndex();