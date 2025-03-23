/**
 * This file is used to test the build process.
 * It should be successfully transpiled by Babel.
 */

const testAsyncFunction = async () => {
  try {
    const result = await Promise.resolve('Build successful!');
    return result;
  } catch (error) {
    console.error('Build failed:', error);
    throw error;
  }
};

const testArrowFunction = () => {
  const items = [1, 2, 3];
  return items.map(item => item * 2);
};

module.exports = {
  testAsyncFunction,
  testArrowFunction
}; 