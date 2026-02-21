const https = require('https');
const fs = require('fs');

const url = 'https://raw.githubusercontent.com/ifahimreza/bangladesh-geojson/master/bd-districts.json';

https.get(url, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const db = JSON.parse(body).districts;
    const ourData = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    const ourDistricts = Object.keys(ourData);
    
    let districtCoords = {};
    const manualMatches = {
      'Chittagong': 'Chattogram', 'Barishal': 'Barisal', 'Bogura': 'Bogra', 'Comilla': 'Cumilla',
      'Maimanshing': 'Mymensingh', 'Bramhanbaria': 'Brahmanbaria', 'Chadpur': 'Chandpur', 'Chapainababganj': 'Nawabganj',
      'Jessore': 'Jashore', 'Jopypurhat': 'Joypurhat', 'Khagrachori': 'Khagrachhari', 'Lakkhipur': 'Lakshmipur',
      'Norail': 'Narail', 'Nougaon': 'Naogaon', 'Panchogor': 'Panchagarh', 'Shatkhira': 'Satkhira',
      'Shirajganj': 'Sirajganj', 'Shunamganj': 'Sunamganj', 'Kishorganj': 'Kishoreganj', 'Borguna': 'Barguna',
      'Jhalkathi': 'Jhalokati', 'Moulovibazar': 'Moulvibazar'
    };

    ourDistricts.forEach(d => {
      let matched = db.find(x => x.name.toLowerCase() === d.toLowerCase() || x.name.toLowerCase().includes(d.toLowerCase()));
      if (!matched && manualMatches[d]) {
        matched = db.find(x => x.name.toLowerCase() === manualMatches[d].toLowerCase());
      }
      if (matched) {
        // The GitHub repo uses 'long' instead of 'lon'
        const lng = matched.lon || matched.long || matched.longitude;
        districtCoords[d] = { lat: parseFloat(matched.lat), lng: parseFloat(lng) };
      }
    });

    if (!districtCoords['Khagrachori']) districtCoords['Khagrachori'] = { lat: 23.119285, lng: 91.984663 };
    if (!districtCoords['Shirajganj']) districtCoords['Shirajganj'] = { lat: 24.4533978, lng: 89.7006815 };
    if (!districtCoords['Moulovibazar']) districtCoords['Moulovibazar'] = { lat: 24.482934, lng: 91.777417 };

    fs.writeFileSync('district_coords.json', JSON.stringify(districtCoords, null, 2));
    console.log('Saved properly!');
  });
});
