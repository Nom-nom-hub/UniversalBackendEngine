/**
 * Generate a random email
 */
function $randomEmail() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let email = '';
  
  // Generate random username
  for (let i = 0; i < 8; i++) {
    email += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Add domain
  email += '@example.com';
  
  return email;
}

/**
 * Select a random product from the response
 */
function selectRandomProduct(userContext, events, done) {
  // Get the products from the previous response
  const products = userContext.vars.products || [];
  
  if (products.length > 0) {
    // Select a random product
    const randomIndex = Math.floor(Math.random() * products.length);
    const product = products[randomIndex];
    
    // Set the product ID for the next request
    userContext.vars.productId = product.id;
  } else {
    // Fallback to a default ID
    userContext.vars.productId = '1';
  }
  
  return done();
}

module.exports = {
  $randomEmail,
  selectRandomProduct
}; 