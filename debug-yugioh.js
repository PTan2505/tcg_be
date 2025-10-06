const fs = require('fs');
const path = require('path');

// Simple test to see what OCR extracts from the Yu-Gi-Oh image
async function testYugiohOCR() {
  try {
    // Read the image
    const imagePath = path.join(__dirname, 'tests/scan-image/yugioh.jpg');
    const imageBuffer = fs.readFileSync(imagePath);
    
    console.log('📷 Image loaded, size:', imageBuffer.length, 'bytes');
    
    // Try to use Tesseract directly
    const Tesseract = require('tesseract.js');
    
    const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: m => console.log(m)
    });
    
    console.log('🔍 Raw OCR text:');
    console.log('================');
    console.log(text);
    console.log('================');
    
    // Split into lines and filter
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    console.log('📝 Extracted lines:');
    lines.forEach((line, i) => {
      console.log(`${i + 1}: "${line.trim()}"`);
    });
    
    // Look for "Dark Magician" patterns
    const darkMagicianPatterns = [
      /dark.*magician/i,
      /magician/i,
      /dark/i
    ];
    
    console.log('\n🎯 Pattern matches:');
    for (const pattern of darkMagicianPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        console.log(`Pattern ${pattern} found: "${matches[0]}"`);
      } else {
        console.log(`Pattern ${pattern} not found`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testYugiohOCR();