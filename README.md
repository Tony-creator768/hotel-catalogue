# GU-Q Hotel & Serviced Apartment Catalogue

This package gives you a live-editable hotel catalogue website. The website is styled in Georgetown Blue and Georgetown Gray, uses Google Sheets as the database, and can be published on Netlify.

Georgetown’s official brand colors used here are:
- Georgetown Blue: `#041E42`
- Georgetown Gray: `#63666A`

## What each file does

| File | Purpose |
|---|---|
| `georgetown_live_hotel_catalogue_template.xlsx` | Upload this to Google Drive, then save it as a Google Sheet. This is the live database. |
| `Code.gs` | Paste this into Google Apps Script. It turns the Google Sheet into a website-readable data feed. |
| `index.html` | Main website page. |
| `styles.css` | Website design, colors, card layout, typography, mobile layout. |
| `app.js` | Website logic: reads Google Sheet data, groups bedroom types under one hotel, filters, details modal, clickable room links. |
| `config.js` | Paste your Apps Script Web App URL here. |
| `sample-data.js` | Backup demo data used only before the website is connected to Google Sheets. |
| `data_dictionary.csv` | Explains every Google Sheet column. |

## Most important rule

Do not rename the Google Sheet tab `Catalogue_View` and do not rename the column headers unless you also edit the code.

You can edit rows freely. Do not break the structure.

## How the website reads the sheet

Each row in `Catalogue_View` is one bedroom/unit option.

Example:

| Property Name | Unit Type | Bedrooms | Monthly Rate QAR | Unit Video URL |
|---|---|---:|---:|---|
| Grand Hyatt Doha Hotel & Villas | 2 Bedroom Ground Floor | 2 | 34000 | room tour link |
| Grand Hyatt Doha Hotel & Villas | 3 Bedroom Ground Floor | 3 | 38000 | room tour link |
| Grand Hyatt Doha Hotel & Villas | 4 Bedroom Ground Floor | 4 | 65000 | room tour link |

The website displays this as one hotel card with all bedroom/unit options under it.

## How to edit later

### Add a new hotel
Add a new row in `Catalogue_View` with a new `Property Name`. Fill in the area, unit type, rate, image/link fields, and set `Approval Status` to `Approved`.

### Add a bedroom type to an existing hotel
Add a new row with the exact same `Property Name` and `Area`. Change the `Unit Type`, `Bedrooms`, price, and room link.

### Hide a hotel or bedroom type
Change `Approval Status` from `Approved` to `Hidden`.

### Delete a hotel or bedroom type
Delete the row. Only do this if you are sure. For temporary removal, use `Hidden`.

### Change price
Edit `Monthly Rate QAR`.

### Add the main hotel card image
Paste a direct image link into `Image URL`.

### Add several hotel images
Paste multiple direct image links into `Gallery URLs`, separated by commas.

Example:

```text
https://example.com/image1.jpg, https://example.com/image2.jpg, https://example.com/image3.jpg
```

### Add bedroom-specific video or website links
Use these columns:

| Column | Use |
|---|---|
| `Unit Video URL` | Best place for a bedroom video, virtual tour, or walkthrough. This has first priority. |
| `Unit Detail URL` | Use this for a specific room/bedroom webpage. |
| `Virtual Tour URL` | Use this for a general hotel tour. |
| `Website URL` | Use this for the hotel’s general website. |

When `Unit Video URL` or `Unit Detail URL` has a link, the bedroom/unit row becomes clickable on the website.

### Add a bedroom-specific image
Paste a direct link in `Unit Image URL`. This is optional. The website uses `Image URL` for the main hotel card first, then `Unit Image URL` as a fallback.

### Control bedroom order
Put numbers in `Unit Display Order`.

Example:

| Unit Type | Unit Display Order |
|---|---:|
| Studio Apartment | 1 |
| 1 Bedroom Apartment | 2 |
| 2 Bedroom Apartment | 3 |

If you leave it blank, the website sorts by bedroom count and price.

## Exact setup steps

### Part A — Prepare Google Sheets

1. Upload `georgetown_live_hotel_catalogue_template.xlsx` to Google Drive.
2. Open it with Google Sheets.
3. Click `File > Save as Google Sheets`.
4. Open the new Google Sheets version.
5. Check the `Catalogue_View` tab.
6. Edit rows, prices, images, and room links as needed.
7. Make sure anything you want visible has `Approval Status = Approved`.

### Part B — Create the Apps Script data link

1. In the Google Sheet, click `Extensions > Apps Script`.
2. Delete any starter code.
3. Open the `Code.gs` file from this package.
4. Copy all its code.
5. Paste it into Apps Script.
6. Click Save.
7. Click `Deploy > New deployment`.
8. Choose deployment type: `Web app`.
9. Description: `Hotel Catalogue API`.
10. Execute as: `Me`.
11. Who has access: choose `Anyone with the link` or the closest option your Google account allows.
12. Click Deploy.
13. Authorize the script.
14. Copy the Web App URL. It should end with `/exec`.

### Part C — Connect the website to Google Sheets

1. Open `config.js`.
2. Find this line:

```javascript
DATA_URL: "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE",
```

3. Replace the placeholder with your Apps Script Web App URL.

Example:

```javascript
DATA_URL: "https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxx/exec",
```

4. Save `config.js`.

### Part D — Publish the website on Netlify

1. Keep these files together in one folder:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `config.js`
   - `sample-data.js`
2. Go to Netlify Drop.
3. Drag the full website folder into Netlify Drop.
4. Netlify will give you a live website link.
5. Open the link and test it.

### Part E — Test live editing

1. Open your Google Sheet.
2. Change one price in `Monthly Rate QAR`.
3. Refresh the website.
4. The new price should appear.

If it does not update, check:
- Did you paste the Apps Script URL into `config.js`?
- Did you deploy Apps Script as a Web App?
- Did you choose the correct access option?
- Is the row marked `Approved`?
- Did you upload the updated website folder to Netlify?

## Image link notes

Do not paste images directly into the cells. Paste image URLs.

Good links usually end in image extensions like:
- `.jpg`
- `.jpeg`
- `.png`
- `.webp`

Google Drive images can work, but sharing permissions must allow the website viewers to open the image. If the image does not appear, open the link in an incognito/private browser. If it does not load there, it will not load on the website.

## Recommended approval workflow

Use the sheet like this:

- Draft rows: `Approval Status = Hidden`
- Final rows: `Approval Status = Approved`
- Internal negotiation notes: keep them in `Internal Notes` or `Internal_Notes`

Do not publish unverified prices, private contacts, or negotiation notes.
