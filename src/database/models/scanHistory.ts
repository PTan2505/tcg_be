import mongoose, { Document, Schema } from 'mongoose';

export interface IScanHistory extends Document {
  userId: Schema.Types.ObjectId;
  gameType: 'pokemon' | 'yugioh' | 'onepiece';
  scannedAt: Date;
  
  // OCR Results
  extractedText: string[];
  ocrConfidence: number;
  
  // Recognition Results
  recognizedCardName?: string;
  recognizedSetCode?: string;
  recognizedRarity?: string;
  
  // Matching Results
  potentialMatches: Array<{
    cardId: Schema.Types.ObjectId;
    confidence: number;
    rank: number;
  }>;
  
  // User Selection
  selectedCardId?: Schema.Types.ObjectId;
  wasAutoSelected: boolean;
  
  // Performance Metrics
  scanDuration: number; // milliseconds
  processingSteps: {
    imagePreprocessing: number;
    ocrExtraction: number;
    cardMatching: number;
    confidenceRanking: number;
  };
  
  // Image Data (optional, for learning)
  imageHash?: string; // Perceptual hash for duplicate detection
  imageSize: {
    width: number;
    height: number;
    fileSize: number; // bytes
  };
  
  // Error Information
  errorMessage?: string;
  errorStep?: 'preprocessing' | 'ocr' | 'matching' | 'selection';
  
  // Learning Data
  userFeedback?: {
    wasCorrect: boolean;
    actualCardId?: Schema.Types.ObjectId;
    feedbackAt: Date;
  };
}

const ScanHistorySchema = new Schema<IScanHistory>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  gameType: {
    type: String,
    enum: ['pokemon', 'yugioh', 'onepiece'],
    required: true,
    index: true
  },
  scannedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // OCR Results
  extractedText: [{
    type: String
  }],
  ocrConfidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  
  // Recognition Results
  recognizedCardName: String,
  recognizedSetCode: String,
  recognizedRarity: String,
  
  // Matching Results
  potentialMatches: [{
    cardId: {
      type: Schema.Types.ObjectId,
      ref: 'Card',
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },
    rank: {
      type: Number,
      min: 1,
      required: true
    }
  }],
  
  // User Selection
  selectedCardId: {
    type: Schema.Types.ObjectId,
    ref: 'Card'
  },
  wasAutoSelected: {
    type: Boolean,
    default: false
  },
  
  // Performance Metrics
  scanDuration: {
    type: Number,
    required: true,
    min: 0
  },
  processingSteps: {
    imagePreprocessing: { type: Number, required: true },
    ocrExtraction: { type: Number, required: true },
    cardMatching: { type: Number, required: true },
    confidenceRanking: { type: Number, required: true }
  },
  
  // Image Data
  imageHash: {
    type: String,
    index: true
  },
  imageSize: {
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    fileSize: { type: Number, required: true }
  },
  
  // Error Information
  errorMessage: String,
  errorStep: {
    type: String,
    enum: ['preprocessing', 'ocr', 'matching', 'selection']
  },
  
  // Learning Data
  userFeedback: {
    wasCorrect: Boolean,
    actualCardId: {
      type: Schema.Types.ObjectId,
      ref: 'Card'
    },
    feedbackAt: Date
  }
}, {
  timestamps: true,
  collection: 'scanhistory'
});

// Indexes for efficient queries
ScanHistorySchema.index({ userId: 1, scannedAt: -1 }); // User's scan history
ScanHistorySchema.index({ gameType: 1, scannedAt: -1 }); // Game-specific scans
ScanHistorySchema.index({ selectedCardId: 1 }); // Find scans for specific cards
ScanHistorySchema.index({ 'userFeedback.wasCorrect': 1 }); // Learning data
ScanHistorySchema.index({ ocrConfidence: 1 }); // OCR quality analysis
ScanHistorySchema.index({ scanDuration: 1 }); // Performance analysis

// Text index for searching extracted text
ScanHistorySchema.index({ extractedText: 'text' });

export const ScanHistory = mongoose.model<IScanHistory>('ScanHistory', ScanHistorySchema);