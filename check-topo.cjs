const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('./src/assets/world.json', 'utf8'));
    const topojson = require('topojson-client');
    // Deldersveld's world file objects are usually named "countries1"
    const features = topojson.feature(data, data.objects.countries1).features;
    
    console.log("Total features:", features.length);
    const properties = features[0].properties;
    console.log("Feature properties example:", Object.keys(properties), properties);
    
    const names = features.map(f => f.properties.name || f.properties.NAME || f.properties.name_long);
    console.log("Includes Seychelles?", names.some(n => n && n.includes('Seychelles')));
    console.log("Includes Mauritius?", names.some(n => n && n.includes('Mauritius')));
    
} catch(e) { console.error(e); }
