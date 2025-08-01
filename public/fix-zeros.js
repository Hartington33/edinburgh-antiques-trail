/**
 * Edinburgh Antiques Trail - Fix Leading Zeros
 * 
 * This script fixes the display of opening hours by removing any leading zeros
 * It can be run from the browser console on any page of the application
 */

(function() {
  // Helper function to clean time strings
  function cleanTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return timeStr;
    
    // Handle special cases
    if (timeStr.toLowerCase().includes('appointment')) {
      return 'By appointment only';
    }
    
    if (timeStr.toLowerCase().includes('closed')) {
      return 'Closed';
    }
    
    // Remove leading zeros from hours
    if (timeStr.match(/^0\d/)) {
      return timeStr.replace(/^0(\d)/, '$1');
    }
    
    // Fix time ranges
    if (timeStr.includes('-')) {
      const parts = timeStr.split('-');
      return parts.map(part => cleanTime(part.trim())).join('-');
    }
    
    return timeStr;
  }
  
  // Process all text nodes in the page
  function processTextNodes(node) {
    if (node.nodeType === 3) { // Text node
      const content = node.textContent;
      
      // Check if the node contains time patterns with leading zeros
      if (content && (
        content.match(/\b0\d:/) || 
        content.match(/\b0\d[aApP][mM]/) ||
        content.includes('0By appointment')
      )) {
        // Replace the content
        node.textContent = cleanTime(content);
      }
    } else if (node.nodeType === 1) { // Element node
      // Process children
      for (let i = 0; i < node.childNodes.length; i++) {
        processTextNodes(node.childNodes[i]);
      }
    }
  }
  
  // Process opening hours displayed in tables
  function processOpeningHoursTables() {
    // Find all opening hours cells in tables
    const cells = document.querySelectorAll('table td');
    cells.forEach(cell => {
      if (cell.textContent.match(/\b0\d:/) || 
          cell.textContent.match(/\b0\d[aApP][mM]/)) {
        cell.textContent = cleanTime(cell.textContent);
      }
    });
  }
  
  // Create a MutationObserver to handle dynamically added content
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          processTextNodes(mutation.addedNodes[i]);
        }
      }
    });
  });
  
  // Run initial processing
  processTextNodes(document.body);
  processOpeningHoursTables();
  
  // Set up observer for future changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ Leading zeros in opening hours have been fixed!');
  console.log('🔄 Any new content will be automatically processed.');
})();
