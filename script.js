document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu toggle
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', function() {
      navLinks.classList.toggle('active');
      mobileMenuBtn.classList.toggle('active');
    });
  }
  
  // Database tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Show corresponding tab pane
      const tabId = this.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
  
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: 'smooth'
        });
        
        // Close mobile menu if open
        if (navLinks.classList.contains('active')) {
          navLinks.classList.remove('active');
          mobileMenuBtn.classList.remove('active');
        }
      }
    });
  });
  
  // Add animation on scroll
  const animateElements = document.querySelectorAll('.feature-card, .api-card, .enterprise-feature, .step');
  
  function checkScroll() {
    animateElements.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      
      if (elementTop < windowHeight * 0.8) {
        element.classList.add('animate');
      }
    });
  }
  
  // Initial check
  checkScroll();
  
  // Check on scroll
  window.addEventListener('scroll', checkScroll);
  
  // Add animation classes
  document.querySelectorAll('.feature-card, .api-card, .enterprise-feature, .step').forEach(element => {
    element.classList.add('fade-in');
  });
  
  // Create SVG logo if image is missing
  const logoImg = document.querySelector('.logo img');
  if (logoImg && logoImg.naturalWidth === 0) {
    createSVGLogo();
  }
  
  // Create hero illustration if image is missing
  const heroImg = document.querySelector('.hero-image img');
  if (heroImg && heroImg.naturalWidth === 0) {
    createHeroIllustration();
  }
});

// Create SVG logo if image is missing
function createSVGLogo() {
  const logoContainers = document.querySelectorAll('.logo, .footer-logo');
  
  logoContainers.forEach(container => {
    const img = container.querySelector('img');
    if (img) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '40');
      svg.setAttribute('height', '40');
      svg.setAttribute('viewBox', '0 0 40 40');
      svg.setAttribute('fill', 'none');
      
      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path1.setAttribute('d', 'M20 5L33.6603 28.75H6.33975L20 5Z');
      path1.setAttribute('fill', '#4F46E5');
      
      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path2.setAttribute('d', 'M20 35L6.33975 11.25H33.6603L20 35Z');
      path2.setAttribute('fill', '#818CF8');
      
      svg.appendChild(path1);
      svg.appendChild(path2);
      
      img.replaceWith(svg);
    }
  });
}

// Create hero illustration if image is missing
function createHeroIllustration() {
  const heroImgContainer = document.querySelector('.hero-image');
  const img = heroImgContainer.querySelector('img');
  
  if (img) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '400');
    svg.setAttribute('height', '300');
    svg.setAttribute('viewBox', '0 0 400 300');
    svg.setAttribute('fill', 'none');
    
    // Database cylinder
    const cylinder = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    const ellipse1 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    ellipse1.setAttribute('cx', '200');
    ellipse1.setAttribute('cy', '80');
    ellipse1.setAttribute('rx', '60');
    ellipse1.setAttribute('ry', '20');
    ellipse1.setAttribute('fill', '#818CF8');
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '140');
    rect.setAttribute('y', '80');
    rect.setAttribute('width', '120');
    rect.setAttribute('height', '100');
    rect.setAttribute('fill', '#4F46E5');
    
    const ellipse2 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    ellipse2.setAttribute('cx', '200');
    ellipse2.setAttribute('cy', '180');
    ellipse2.setAttribute('rx', '60');
    ellipse2.setAttribute('ry', '20');
    ellipse2.setAttribute('fill', '#818CF8');
    
    cylinder.appendChild(ellipse1);
    cylinder.appendChild(rect);
    cylinder.appendChild(ellipse2);
    
    // API connections
    const connections = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // REST
    const restBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    restBox.setAttribute('x', '50');
    restBox.setAttribute('y', '40');
    restBox.setAttribute('width', '60');
    restBox.setAttribute('height', '30');
    restBox.setAttribute('rx', '5');
    restBox.setAttribute('fill', '#10B981');
    
    const restText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    restText.setAttribute('x', '80');
    restText.setAttribute('y', '60');
    restText.setAttribute('text-anchor', 'middle');
    restText.setAttribute('fill', 'white');
    restText.setAttribute('font-size', '12');
    restText.textContent = 'REST';
    
    const restLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    restLine.setAttribute('x1', '110');
    restLine.setAttribute('y1', '55');
    restLine.setAttribute('x2', '140');
    restLine.setAttribute('y2', '80');
    restLine.setAttribute('stroke', '#10B981');
    restLine.setAttribute('stroke-width', '2');
    
    // GraphQL
    const graphqlBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    graphqlBox.setAttribute('x', '50');
    graphqlBox.setAttribute('y', '100');
    graphqlBox.setAttribute('width', '60');
    graphqlBox.setAttribute('height', '30');
    graphqlBox.setAttribute('rx', '5');
    graphqlBox.setAttribute('fill', '#3B82F6');
    
    const graphqlText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    graphqlText.setAttribute('x', '80');
    graphqlText.setAttribute('y', '120');
    graphqlText.setAttribute('text-anchor', 'middle');
    graphqlText.setAttribute('fill', 'white');
    graphqlText.setAttribute('font-size', '12');
    graphqlText.textContent = 'GraphQL';
    
    const graphqlLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    graphqlLine.setAttribute('x1', '110');
    graphqlLine.setAttribute('y1', '115');
    graphqlLine.setAttribute('x2', '140');
    graphqlLine.setAttribute('y2', '115');
    graphqlLine.setAttribute('stroke', '#3B82F6');
    graphqlLine.setAttribute('stroke-width', '2');
    
    // WebSocket
    const wsBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    wsBox.setAttribute('x', '50');
    wsBox.setAttribute('y', '160');
    wsBox.setAttribute('width', '60');
    wsBox.setAttribute('height', '30');
    wsBox.setAttribute('rx', '5');
    wsBox.setAttribute('fill', '#F59E0B');
    
    const wsText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    wsText.setAttribute('x', '80');
    wsText.setAttribute('y', '180');
    wsText.setAttribute('text-anchor', 'middle');
    wsText.setAttribute('fill', 'white');
    wsText.setAttribute('font-size', '12');
    wsText.textContent = 'WebSocket';
    
    const wsLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    wsLine.setAttribute('x1', '110');
    wsLine.setAttribute('y1', '175');
    wsLine.setAttribute('x2', '140');
    wsLine.setAttribute('y2', '150');
    wsLine.setAttribute('stroke', '#F59E0B');
    wsLine.setAttribute('stroke-width', '2');
    
    // gRPC
    const grpcBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    grpcBox.setAttribute('x', '50');
    grpcBox.setAttribute('y', '220');
    grpcBox.setAttribute('width', '60');
    grpcBox.setAttribute('height', '30');
    grpcBox.setAttribute('rx', '5');
    grpcBox.setAttribute('fill', '#EF4444');
    
    const grpcText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    grpcText.setAttribute('x', '80');
    grpcText.setAttribute('y', '240');
    grpcText.setAttribute('text-anchor', 'middle');
    grpcText.setAttribute('fill', 'white');
    grpcText.setAttribute('font-size', '12');
    grpcText.textContent = 'gRPC';
    
    const grpcLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    grpcLine.setAttribute('x1', '110');
    grpcLine.setAttribute('y1', '235');
    grpcLine.setAttribute('x2', '140');
    grpcLine.setAttribute('y2', '180');
    grpcLine.setAttribute('stroke', '#EF4444');
    grpcLine.setAttribute('stroke-width', '2');
    
    connections.appendChild(restBox);
    connections.appendChild(restText);
    connections.appendChild(restLine);
    connections.appendChild(graphqlBox);
    connections.appendChild(graphqlText);
    connections.appendChild(graphqlLine);
    connections.appendChild(wsBox);
    connections.appendChild(wsText);
    connections.appendChild(wsLine);
    connections.appendChild(grpcBox);
    connections.appendChild(grpcText);
    connections.appendChild(grpcLine);
    
    svg.appendChild(cylinder);
    svg.appendChild(connections);
    
    img.replaceWith(svg);
  }
} 