const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Path to input and output files
const inputFile = path.join(__dirname, '..', 'data', 'Antique Tours Data.csv');
const outputFile = path.join(__dirname, '..', 'data', 'processed-shops.csv');

// Function to convert "10 to 5" format to "10:00-17:00" format
function formatOpeningHours(timeString) {
  if (!timeString || timeString.trim() === '') return '';
  
  // Parse the time string (e.g., "10 to 5")
  const parts = timeString.trim().split(/\s+to\s+/);
  if (parts.length !== 2) return '';
  
  const openHour = parseInt(parts[0], 10);
  const closeHour = parseInt(parts[1], 10);
  
  if (isNaN(openHour) || isNaN(closeHour)) return '';
  
  // Format as HH:MM-HH:MM
  const openTime = `${openHour.toString().padStart(2, '0')}:00`;
  // Convert to 24-hour format if needed (assume afternoon closing time)
  const closeTime = `${(closeHour < openHour ? closeHour + 12 : closeHour).toString().padStart(2, '0')}:00`;
  
  return `${openTime}-${closeTime}`;
}

// Read and process the CSV file
try {
  console.log(`Reading CSV from ${inputFile}...`);
  const csvContent = fs.readFileSync(inputFile, 'utf8');
  
  // Parse the CSV
  const parsedCsv = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
  });
  
  if (parsedCsv.errors.length > 0) {
    console.error('Errors parsing CSV:', parsedCsv.errors);
    process.exit(1);
  }
  
  // Transform the data
  const transformedData = parsedCsv.data.map(row => {
    // Skip completely empty rows and ignore Armstrong
    if (Object.values(row).every(val => !val || val.trim() === '') || row.name === 'Armstrongs') {
      return null;
    }
    
    // Check if this is an appointment-only shop
    const isAppointmentOnly = 
      (row['type name'] && row['type name'].toLowerCase().includes('appointment')) ||
      (row.Specialities && row.Specialities.toLowerCase().includes('appointment'));
    
    // Format opening hours
    const openingHours = {
      opening_hours_mon: formatOpeningHours(row.M),
      opening_hours_tue: formatOpeningHours(row.T),
      opening_hours_wed: formatOpeningHours(row.W),
      opening_hours_thu: formatOpeningHours(row.T),  // Note: The CSV has T twice for Thu
      opening_hours_fri: formatOpeningHours(row.F),
      opening_hours_sat: formatOpeningHours(row.S),  // First S for Sat
      opening_hours_sun: formatOpeningHours(row.S),  // Second S for Sun (we'll need to fix this)
      is_appointment_only: isAppointmentOnly
    };
    
    // Create a new row with the correct column names and formatted data
    return {
      name: row.name || '',
      address: row.address || '',
      postcode: row.postcode || '',
      phone: '',  // Default empty
      email: '',  // Default empty
      website: '',  // Default empty
      description: '',  // Default empty
      specialties: row.Specialities || '',
      type_name: row['type name'] || 'Antique Shop',  // Default to Antique Shop
      price_range: '££',  // Default price range
      ...openingHours
    };
  }).filter(Boolean);  // Remove null rows
  
  // Generate new CSV
  const newCsv = Papa.unparse(transformedData);
  
  // Write to output file
  fs.writeFileSync(outputFile, newCsv);
  console.log(`Processed CSV written to ${outputFile}`);
  
  // Also create a version for direct editing in case they want to fix any data
  const editableOutput = path.join(__dirname, '..', 'data', 'shops-to-edit.csv');
  fs.writeFileSync(editableOutput, newCsv);
  console.log(`Editable version saved to ${editableOutput}`);
  
  console.log(`\nTotal rows processed: ${transformedData.length}`);
  
} catch (error) {
  console.error('Error processing CSV:', error);
  process.exit(1);
}
