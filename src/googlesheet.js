// googleSheet.js
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Chemin vers le fichier de clés JSON du service account
const KEYFILEPATH = path.join(__dirname, './Credentials.json');

// ID de votre Google Sheet (vous le trouvez dans l’URL de la feuille)
const SPREADSHEET_ID = '1zrs4X_-DUprLgSgc3659jwiLkvFR-J9LzCK0s021Ts4';
// Plage de cellules à lire, par exemple "Feuille1!A:A" pour lire toute la colonne A
const RANGE = 'Form Responses 1!B:B';

async function authorize() {
  // Charge le fichier JSON
  const credentials = JSON.parse(fs.readFileSync(KEYFILEPATH, 'utf8'));

  // Crée un client JWT
  const client = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets'] // scope
  );

  
  await client.authorize();
  return client;
}

async function getDiscordIDs() {
  const auth = await authorize();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
  });
  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    console.log('Aucune donnée trouvée.');
    return [];
  }
  // rows est un tableau de tableaux, chaque sous-tableau représente une ligne
  // Dans la colonne A, c’est rows[i][0]
  return rows.map(row => row[0]); // On ne prend que la première colonne
}

module.exports = {
  getDiscordIDs
};
