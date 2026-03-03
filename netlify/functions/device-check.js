const { google } = require("googleapis");

exports.handler = async (event) => {
  try {
    const { email, deviceId } = JSON.parse(event.body);

    if (!email || !deviceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: "Email & Device wajib diisi" }),
      };
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "USER!A:C",
    });

    const rows = response.data.values || [];

    const rowIndex = rows.findIndex((row) => row[0] === email);

    if (rowIndex === -1) {
      return {
        statusCode: 403,
        body: JSON.stringify({ success: false, message: "Email tidak terdaftar" }),
      };
    }

    const device1 = rows[rowIndex][1];
    const device2 = rows[rowIndex][2];

    // Kalau device sudah pernah login
    if (device1 === deviceId || device2 === deviceId) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Login berhasil (device dikenali)" }),
      };
    }

    // Kalau slot masih kosong
    if (!device1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `USER!B${rowIndex + 1}`,
        valueInputOption: "RAW",
        requestBody: { values: [[deviceId]] },
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Device pertama disimpan" }),
      };
    }

    if (!device2) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `USER!C${rowIndex + 1}`,
        valueInputOption: "RAW",
        requestBody: { values: [[deviceId]] },
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Device kedua disimpan" }),
      };
    }

    return {
      statusCode: 403,
      body: JSON.stringify({ success: false, message: "Maksimal 2 device tercapai" }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};