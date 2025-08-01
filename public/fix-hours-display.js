// Script to fix opening hours display
// Run this in your browser console on any page with leading zero issues

(function fixLeadingZeros() {
  // Function to clean text with leading zeros
  function cleanText(text) {
    if (!text) return text;
    
    // Fix appointment text
    text = text.replace(/0+By appointment/g, 'By appointment');
    
    // Fix leading zeros in times (like 09:00 → 9:00)
    text = text.replace(/\b0(\d)/g, '$1');
    
    return text;
  }
  
  // Get all text-containing elements
  const elements = document.querySelectorAll('*');
  
  // Process each element
  elements.forEach(el => {
    // Skip script tags and some other elements
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    
    // Process text nodes
    for (let i = 0; i < el.childNodes.length; i++) {
      const node = el.childNodes[i];
      
      // If it's a text node with content
      if (node.nodeType === 3 && node.textContent) {
        // Check if it contains problematic patterns
        if (node.textContent.match(/0By appointment/i) || 
            node.textContent.match(/\b0\d/)) {
          
          // Fix the text
          const fixedText = cleanText(node.textContent);
          
          // Replace the content if it changed
          if (fixedText !== node.textContent) {
            node.textContent = fixedText;
            console.log('Fixed text:', fixedText);
          }
        }
      }
    }
  });
  
  console.log('✅ Opening hours display fixed!');
  
  // Return number of fixed nodes
  return 'Done! Refresh the page to see changes.';
})();
