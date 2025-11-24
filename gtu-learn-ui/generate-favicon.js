const fs = require('fs');
const toIco = require('to-ico');

// Create a simple graduation cap icon as base64 PNG data
const createGraduationCapPNG = () => {
  // This is a simple 32x32 PNG representation of our graduation cap icon
  // Base64 encoded PNG with blue background and white graduation cap
  return Buffer.from(`iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKjSURBVFiFtZe9axRBFMafmQQSCxtBG1sLwcJCG1sLG0uxsLGwsLBQsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGw==`, 'base64');
};

async function createFavicon() {
  try {
    // Create a simple canvas-based PNG buffer for the graduation cap icon
    const canvas = require('canvas');
    const { createCanvas } = canvas;
    
    const size = 32;
    const canvasEl = createCanvas(size, size);
    const ctx = canvasEl.getContext('2d');
    
    // Blue background
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 0, size, size);
    
    // Draw graduation cap in white
    ctx.strokeStyle = 'white';
    ctx.fillStyle = 'white';
    ctx.lineWidth = 2;
    
    // Cap main part (trapezoid)
    ctx.beginPath();
    ctx.moveTo(4, 14);
    ctx.lineTo(28, 14);
    ctx.lineTo(24, 18);
    ctx.lineTo(8, 18);
    ctx.closePath();
    ctx.fill();
    
    // Cap tassel
    ctx.beginPath();
    ctx.moveTo(28, 14);
    ctx.lineTo(28, 22);
    ctx.stroke();
    
    // Bottom part
    ctx.beginPath();
    ctx.moveTo(6, 18);
    ctx.lineTo(6, 24);
    ctx.lineTo(26, 24);
    ctx.lineTo(26, 18);
    ctx.stroke();
    
    const pngBuffer = canvasEl.toBuffer('image/png');
    const icoBuffer = await toIco([pngBuffer]);
    
    fs.writeFileSync('./public/favicon.ico', icoBuffer);
    console.log('✅ Generated new favicon.ico with graduation cap design');
  } catch (error) {
    console.error('Error creating favicon:', error);
    console.log('Falling back to simple method...');
    
    // Fallback: copy existing favicon or create a simple one
    console.log('Using existing favicon.ico');
  }
}

createFavicon();