const fs = require('fs');
const https = require('https');

async function downloadData() {
    try {
        console.log("Downloading 50m World Map...");
        const worldRes = await fetch('https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json');
        if (worldRes.ok) {
            const worldData = await worldRes.json();
            fs.writeFileSync('./src/assets/world.json', JSON.stringify(worldData));
            console.log("World map saved.");
        } else {
            console.log("World map fetch failed:", worldRes.status);
        }

        console.log("Downloading Highcharts UK Map...");
        const ukRes = await fetch('https://code.highcharts.com/mapdata/countries/gb/gb-all.topo.json', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        
        if (ukRes.ok) {
            const ukText = await ukRes.text();
            const cleanedUkText = ukText.replace(/\/\*[\s\S]*?\*\//g, '').trim();
            const ukData = JSON.parse(cleanedUkText);
            fs.writeFileSync('./src/assets/uk-counties.json', JSON.stringify(ukData));
            console.log("UK map saved.");
        } else {
             console.log("UK map fetch failed:", ukRes.status);
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

downloadData();
