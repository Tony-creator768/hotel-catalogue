const CONFIG = window.CATALOGUE_CONFIG || {};
const SAMPLE = window.SAMPLE_CATALOGUE_DATA || { rows: [] };

let catalogueRows = [];
let filteredRows = [];
let filteredGroups = [];
const selectedForCompare = new Map();

const els = {
  grid: document.querySelector("#catalogueGrid"),
  search: document.querySelector("#searchInput"),
  area: document.querySelector("#areaFilter"),
  category: document.querySelector("#categoryFilter"),
  bedrooms: document.querySelector("#bedroomFilter"),
  pet: document.querySelector("#petFilter"),
  sort: document.querySelector("#sortSelect"),
  count: document.querySelector("#resultCount"),
  propertyCount: document.querySelector("#propertyCount"),
  minRate: document.querySelector("#minRate"),
  petCount: document.querySelector("#petCount"),
  updatedAt: document.querySelector("#updatedAt"),
  modal: document.querySelector("#detailModal"),
  modalBody: document.querySelector("#modalBody"),
  compareDrawer: document.querySelector("#compareDrawer"),
  compareContent: document.querySelector("#compareContent")
};

function toNumber(value) {
  if (typeof value === "number") return value;
  const cleaned = String(value || "").replace(/[^\d.]/g, "");
  return cleaned ? Number(cleaned) : 0;
}

function get(row, key) {
  return row[key] ?? "";
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "property";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeRows(rows) {
  return (rows || [])
    .filter(row => get(row, "Property Name") || get(row, "Unit Type"))
    .filter(row => {
      if (!CONFIG.APPROVED_ONLY) return true;
      return String(get(row, "Approval Status") || "Approved").toLowerCase() === "approved";
    })
    .map((row, index) => ({
      ...row,
      _id: get(row, "Record ID") || `row-${index}`,
      _propertyKey: normalizeKey(`${get(row, "Property Name")} ${get(row, "Area")}`),
      _rateQar: toNumber(get(row, "Monthly Rate QAR")),
      _unitOrder: toNumber(get(row, "Unit Display Order")),
      _bedrooms: String(get(row, "Bedrooms") || "").trim(),
      _search: [
        get(row, "Property Name"),
        get(row, "Category"),
        get(row, "Area"),
        get(row, "Address"),
        get(row, "Unit Type"),
        get(row, "Amenities / Inclusions"),
        get(row, "Pet Friendly"),
        get(row, "Booking / Display Notes")
      ].join(" ").toLowerCase()
    }));
}

async function loadFromFetch(url) {
  const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, {
    method: "GET",
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

function loadFromJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `catalogueCallback_${Date.now()}`;
    const script = document.createElement("script");
    const separator = url.includes("?") ? "&" : "?";

    window[callbackName] = data => {
      resolve(data);
      delete window[callbackName];
      script.remove();
    };

    script.onerror = () => {
      delete window[callbackName];
      script.remove();
      reject(new Error("JSONP load failed"));
    };

    script.src = `${url}${separator}callback=${callbackName}&t=${Date.now()}`;
    document.body.appendChild(script);
  });
}

async function loadData() {
  const url = String(CONFIG.DATA_URL || "").trim();

  if (!url || url.includes("PASTE_YOUR")) {
    return SAMPLE;
  }

  try {
    return await loadFromFetch(url);
  } catch (fetchError) {
    console.warn("Fetch failed. Trying JSONP fallback.", fetchError);

    try {
      return await loadFromJsonp(url);
    } catch (jsonpError) {
      console.warn("JSONP failed. Using sample data.", jsonpError);
      return SAMPLE;
    }
  }
}

function uniqueOptions(rows, key) {
  return [...new Set(rows.map(row => String(get(row, key)).trim()).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

function fillSelect(select, values, defaultLabel) {
  select.innerHTML = `<option value="">${defaultLabel}</option>` + values
    .map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
}

function formatMoney(value) {
  if (!value) return "Rate on request";
  return `QAR ${Number(value).toLocaleString()}`;
}

function initials(name) {
  return String(name || "Hotel")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(word => word[0])
    .join("")
    .toUpperCase();
}

function firstNonEmpty(rows, key) {
  const found = rows.find(row => String(get(row, key) || "").trim());
  return found ? get(found, key) : "";
}

function distinctValues(rows, key) {
  return [...new Set(rows.map(row => String(get(row, key) || "").trim()).filter(Boolean))];
}

function sortUnitRows(rows) {
  return [...rows].sort((a, b) => {
    const orderA = a._unitOrder || 9999;
    const orderB = b._unitOrder || 9999;

    if (orderA !== orderB) return orderA - orderB;

    const bedroomCompare = String(get(a, "Bedrooms")).localeCompare(
      String(get(b, "Bedrooms")),
      undefined,
      { numeric: true }
    );

    if (bedroomCompare !== 0) return bedroomCompare;

    return (a._rateQar || Infinity) - (b._rateQar || Infinity);
  });
}

function firstLink(row) {
  return String(
    get(row, "Unit Video URL") ||
    get(row, "Unit Detail URL") ||
    get(row, "Virtual Tour URL") ||
    get(row, "Website URL") ||
    get(row, "Flyer URL") ||
    ""
  ).trim();
}

function groupRows(rows) {
  const map = new Map();

  rows.forEach(row => {
    const name = String(get(row, "Property Name") || "Unnamed property").trim();
    const area = String(get(row, "Area") || "").trim();
    const key = normalizeKey(`${name} ${area}`);

    if (!map.has(key)) {
      map.set(key, { _id: key, rows: [], name, area });
    }

    map.get(key).rows.push(row);
  });

  return [...map.values()].map(group => {
    const rowsSorted = sortUnitRows(group.rows);
    const rates = rowsSorted.map(row => row._rateQar).filter(Boolean);
    const bedrooms = distinctValues(rowsSorted, "Bedrooms").sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { numeric: true })
    );
    const categories = distinctValues(rowsSorted, "Category");
    const petValues = distinctValues(rowsSorted, "Pet Friendly");

    return {
      ...group,
      rows: rowsSorted,
      allRows: sortUnitRows(catalogueRows.filter(row => row._propertyKey === group._id)),
      category: categories.join(" / "),
      address: firstNonEmpty(rowsSorted, "Address"),
      image: firstNonEmpty(rowsSorted, "Image URL") || firstNonEmpty(rowsSorted, "Unit Image URL"),
      website: firstNonEmpty(rowsSorted, "Website URL"),
      virtualTour: firstNonEmpty(rowsSorted, "Virtual Tour URL"),
      flyer: firstNonEmpty(rowsSorted, "Flyer URL"),
      gallery: distinctValues(rowsSorted, "Gallery URLs").join(", "),
      amenities: distinctValues(rowsSorted, "Amenities / Inclusions").join(" | "),
      cancellation: distinctValues(rowsSorted, "Cancellation Policy").join(" | "),
      contactName: firstNonEmpty(rowsSorted, "Contact Name"),
      contactEmail: firstNonEmpty(rowsSorted, "Contact Email"),
      contactPhone: firstNonEmpty(rowsSorted, "Contact Phone"),
      minRate: rates.length ? Math.min(...rates) : 0,
      maxRate: rates.length ? Math.max(...rates) : 0,
      bedrooms,
      petValues,
      unitCount: rowsSorted.length,
      _search: rowsSorted.map(row => row._search).join(" ")
    };
  });
}

function mediaHtml(item) {
  const image = String(
    item.image ||
    firstNonEmpty(item.rows || [], "Image URL") ||
    firstNonEmpty(item.rows || [], "Unit Image URL") ||
    ""
  ).trim();

  const name = item.name || firstNonEmpty(item.rows || [], "Property Name");

  if (image) {
    return `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" onerror="this.remove(); this.parentElement.insertAdjacentHTML('beforeend','<div class=&quot;media-initials&quot;>${initials(name)}</div>')">`;
  }

  return `<div class="media-initials">${initials(name)}</div>`;
}

function shortText(value, length = 150) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= length) return text;
  return `${text.slice(0, length)}…`;
}

function splitList(value) {
  return String(value || "")
    .split(/\s*[|;,]\s*/)
    .map(item => item.trim())
    .filter(Boolean);
}

function amenityChipsHtml(value, limit = 3) {
  const items = splitList(value);

  if (!items.length) {
    return `<div class="amenities">Amenities not listed</div>`;
  }

  const visible = items.slice(0, limit);
  const more = items.length - visible.length;

  return `
    <div class="amenity-chips">
      ${visible.map(item => `<span class="amenity-chip">${escapeHtml(shortText(item, 32))}</span>`).join("")}
      ${more > 0 ? `<span class="amenity-chip">+${more} more</span>` : ""}
    </div>
  `;
}

function petLabel(values) {
  const combined = String((values || []).join(" / ")).toLowerCase();

  if (!combined) return "Pet policy not listed";
  if (combined.includes("yes")) return "Pet-friendly";
  if (combined.includes("no")) return "No pets";

  return values.join(" / ");
}

/**
 * This is the important function.
 * It shows ONLY the room size, not 1BR / 2BR / 3BR.
 */
function sizeOnlyLabel(row) {
  const size = String(get(row, "Size SQM") || "").trim();

  if (size) {
    return `${escapeHtml(size)} sqm`;
  }

  return "Size not listed";
}

function unitRowHtml(row, compact = false) {
  const href = firstLink(row);

  const content = `
    <div>
      <strong>${escapeHtml(get(row, "Unit Type") || "Unit type not listed")}</strong>
      <span>${sizeOnlyLabel(row)}</span>
    </div>
    <div class="unit-side">
      <div class="unit-price">${formatMoney(row._rateQar)}</div>
      ${href ? `<span class="unit-link-label">View room</span>` : `<span class="unit-link-label muted-link">No link</span>`}
    </div>
  `;

  if (href) {
    return `<a class="unit-row unit-row-link${compact ? " compact" : ""}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" title="Open bedroom video, virtual tour, or page">${content}</a>`;
  }

  return `<div class="unit-row${compact ? " compact" : ""}">${content}</div>`;
}

function rateRange(group) {
  if (!group.minRate) return "Rate on request";
  if (group.minRate === group.maxRate) return formatMoney(group.minRate);
  return `${formatMoney(group.minRate)} – ${formatMoney(group.maxRate)}`;
}

function renderStats(rows, groups) {
  const rates = rows.map(row => row._rateQar).filter(Boolean);
  const petGroups = groups.filter(group =>
    group.rows.some(row => String(get(row, "Pet Friendly")).toLowerCase().includes("yes"))
  );

  els.count.textContent = `${rows.length} unit option${rows.length === 1 ? "" : "s"}`;
  els.propertyCount.textContent = groups.length;
  els.minRate.textContent = rates.length ? `${Math.min(...rates).toLocaleString()} QAR` : "—";
  els.petCount.textContent = petGroups.length;
}

function renderCards(groups) {
  if (!groups.length) {
    els.grid.innerHTML = `<div class="empty">No matching hotels. Check your filters or Approval Status in Google Sheets.</div>`;
    return;
  }

  els.grid.innerHTML = groups.map(group => {
    const id = group._id;
    const isSelected = selectedForCompare.has(id);

    return `
      <article class="card hotel-card">
        <div class="card-media">
          ${mediaHtml(group)}
          <span class="badge">${escapeHtml(group.category || "Hotel / Residence")}</span>
        </div>

        <div class="card-body">
          <div class="hotel-title-row">
            <h3>${escapeHtml(group.name)}</h3>
          </div>

          <div class="unit">
            ${escapeHtml(group.area || "Area not listed")}${group.address ? ` • ${escapeHtml(group.address)}` : ""}
          </div>

          <div class="meta">
            <span class="pill">${group.unitCount} unit option${group.unitCount === 1 ? "" : "s"}</span>
            <span class="pill">${escapeHtml(petLabel(group.petValues))}</span>
          </div>

          ${amenityChipsHtml(group.amenities, 3)}

          <div class="unit-list-head">
            <strong>Bedroom / unit types</strong>
            <span>Click linked rows to view room</span>
          </div>

          <div class="unit-list">
            ${group.rows.map(row => unitRowHtml(row, true)).join("")}
          </div>

          <div class="card-actions">
            <button class="primary" onclick="openDetails('${escapeHtml(id)}')">View details</button>
            <button class="${isSelected ? "compare-selected" : "ghost"}" onclick="toggleCompare('${escapeHtml(id)}')">
              ${isSelected ? "Selected" : "Compare"}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function applyFilters() {
  const query = String(els.search.value || "").toLowerCase().trim();
  const area = els.area.value;
  const category = els.category.value;
  const bedroom = els.bedrooms.value;
  const pet = els.pet.value;
  const sort = els.sort.value;

  filteredRows = catalogueRows.filter(row => {
    const matchesSearch = !query || row._search.includes(query);
    const matchesArea = !area || get(row, "Area") === area;
    const matchesCategory = !category || get(row, "Category") === category;
    const matchesBedroom = !bedroom || String(get(row, "Bedrooms")) === bedroom;
    const petValue = String(get(row, "Pet Friendly")).toLowerCase();
    const matchesPet = !pet || (pet === "yes" ? petValue.includes("yes") : petValue.includes("no"));

    return matchesSearch && matchesArea && matchesCategory && matchesBedroom && matchesPet;
  });

  filteredGroups = groupRows(filteredRows);

  filteredGroups.sort((a, b) => {
    if (sort === "price-low") return (a.minRate || Infinity) - (b.minRate || Infinity);
    if (sort === "price-high") return (b.minRate || 0) - (a.minRate || 0);

    if (sort === "bedrooms") {
      const aMin = Math.min(...a.bedrooms.map(Number).filter(n => !Number.isNaN(n)));
      const bMin = Math.min(...b.bedrooms.map(Number).filter(n => !Number.isNaN(n)));
      return (aMin || 99) - (bMin || 99);
    }

    return String(a.name).localeCompare(String(b.name));
  });

  renderStats(filteredRows, filteredGroups);
  renderCards(filteredGroups);
}

function openDetails(id) {
  const group = filteredGroups.find(item => item._id === id) || groupRows(catalogueRows).find(item => item._id === id);

  if (!group) return;

  const rowsToShow = group.allRows.length ? group.allRows : group.rows;

  const links = [
    ["Website", group.website],
    ["Virtual tour", group.virtualTour],
    ["Flyer", group.flyer]
  ].filter(([, url]) => String(url || "").trim());

  const gallery = String(group.gallery || "")
    .split(",")
    .map(url => url.trim())
    .filter(Boolean);

  const contact = [group.contactName, group.contactEmail, group.contactPhone]
    .filter(Boolean)
    .join(" | ") || "Not listed";

  els.modalBody.innerHTML = `
    <div class="modal-card no-detail-image">
      <button class="close" onclick="closeDetails()">Close</button>

      <div class="modal-content">
        <p class="eyebrow modal-eyebrow">${escapeHtml(group.category || "Hotel / Residence")}</p>

        <h2 style="margin:0 0 6px;font-size:2rem;letter-spacing:-0.04em;">
          ${escapeHtml(group.name)}
        </h2>

        <p style="margin:0 0 18px;color:#64748b;">
          ${escapeHtml(group.area || "Area not listed")}${group.address ? ` • ${escapeHtml(group.address)}` : ""}
        </p>

        <div class="details-grid">
          <div class="detail-block">
            <h4>Unit options</h4>
            <p>${rowsToShow.length} approved bedroom/unit option${rowsToShow.length === 1 ? "" : "s"}</p>
          </div>

          <div class="detail-block">
            <h4>Location</h4>
            <p>${escapeHtml(group.area || "Area not listed")}\n${escapeHtml(group.address || "Address not listed")}</p>
          </div>

          <div class="detail-block">
            <h4>Amenities / Inclusions</h4>
            <p>${escapeHtml(group.amenities || "Not listed")}</p>
          </div>

          <div class="detail-block">
            <h4>Policy & Contact</h4>
            <p>Pet policy: ${escapeHtml(group.petValues.join(" / ") || "Not specified")}\nCancellation: ${escapeHtml(group.cancellation || "Not listed")}\nContact: ${escapeHtml(contact)}</p>
          </div>
        </div>

        <div class="detail-block unit-options-block" style="margin-top:14px;">
          <h4>All bedroom / unit types for this hotel</h4>

          <div class="unit-options-table">
            ${rowsToShow.map(row => {
              const href = firstLink(row);

              const line = `
                <div>
                  <strong>${escapeHtml(get(row, "Unit Type") || "Unit type not listed")}</strong>
                  <span>${sizeOnlyLabel(row)}</span>
                </div>

                <div>
                  <strong>${formatMoney(row._rateQar)}</strong>
                  ${get(row, "Monthly Rate USD Approx") ? `<span>Approx. ${Number(toNumber(get(row, "Monthly Rate USD Approx"))).toLocaleString()} USD</span>` : ""}
                  ${href ? `<span class="unit-link-label">Open room link</span>` : ""}
                </div>
              `;

              return href
                ? `<a class="unit-option-line unit-option-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${line}</a>`
                : `<div class="unit-option-line">${line}</div>`;
            }).join("")}
          </div>
        </div>

        ${links.length ? `<div class="links">${links.map(([label, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`).join("")}</div>` : ""}

        ${gallery.length ? `<div class="detail-block" style="margin-top:14px;"><h4>Gallery links</h4><p>${gallery.map(url => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`).join("<br>")}</p></div>` : ""}

        ${distinctValues(rowsToShow, "Booking / Display Notes").length ? `<div class="detail-block" style="margin-top:14px;"><h4>Notes</h4><p>${escapeHtml(distinctValues(rowsToShow, "Booking / Display Notes").join("\n"))}</p></div>` : ""}
      </div>
    </div>
  `;

  els.modal.classList.add("open");
}

function closeDetails() {
  els.modal.classList.remove("open");
}

function toggleCompare(id) {
  const group = filteredGroups.find(item => item._id === id) || groupRows(catalogueRows).find(item => item._id === id);

  if (!group) return;

  if (selectedForCompare.has(id)) {
    selectedForCompare.delete(id);
  } else {
    if (selectedForCompare.size >= 4) {
      alert("Compare up to 4 hotels at a time.");
      return;
    }

    selectedForCompare.set(id, group);
  }

  renderCompare();
  renderCards(filteredGroups);
}

function renderCompare() {
  const groups = [...selectedForCompare.values()];

  if (!groups.length) {
    els.compareDrawer.classList.remove("open");
    els.compareContent.innerHTML = "";
    return;
  }

  els.compareDrawer.classList.add("open");

  els.compareContent.innerHTML = `
    <table class="compare-table">
      <thead>
        <tr>
          <th>Hotel</th>
          <th>Area</th>
          <th>Bedroom/unit types</th>
          <th>Rate range</th>
          <th>Pet</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        ${groups.map(group => `
          <tr>
            <td><strong>${escapeHtml(group.name)}</strong></td>
            <td>${escapeHtml(group.area)}</td>
            <td>${escapeHtml(group.rows.map(row => get(row, "Unit Type")).filter(Boolean).join("; "))}</td>
            <td>${rateRange(group)}</td>
            <td>${escapeHtml(group.petValues.join(" / "))}</td>
            <td><button class="ghost" onclick="toggleCompare('${escapeHtml(group._id)}')">Remove</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function exportCsv() {
  const headers = [
    "Property Name",
    "Category",
    "Area",
    "Address",
    "Unit Type",
    "Bedrooms",
    "Size SQM",
    "Monthly Rate QAR",
    "Pet Friendly",
    "Contact Email",
    "Website URL",
    "Unit Detail URL",
    "Unit Video URL"
  ];

  const csvRows = [headers.join(",")].concat(
    filteredRows.map(row => headers.map(h => `"${String(get(row, h)).replaceAll('"', '""')}"`).join(","))
  );

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "hotel-catalogue-export.csv";
  a.click();

  URL.revokeObjectURL(url);
}

function bindEvents() {
  [els.search, els.area, els.category, els.bedrooms, els.pet, els.sort].forEach(el => {
    el.addEventListener("input", applyFilters);
    el.addEventListener("change", applyFilters);
  });

  document.querySelector("#printBtn").addEventListener("click", () => window.print());
  document.querySelector("#exportBtn").addEventListener("click", exportCsv);
  document.querySelector("#refreshBtn").addEventListener("click", init);

  els.modal.addEventListener("click", event => {
    if (event.target === els.modal) closeDetails();
  });
}

async function init() {
  els.grid.innerHTML = `<div class="empty">Loading catalogue data…</div>`;

  const payload = await loadData();

  catalogueRows = normalizeRows(payload.rows || []);

  fillSelect(els.area, uniqueOptions(catalogueRows, "Area"), "All areas");
  fillSelect(els.category, uniqueOptions(catalogueRows, "Category"), "All categories");
  fillSelect(els.bedrooms, uniqueOptions(catalogueRows, "Bedrooms"), "Any bedroom");

  const updated = payload.updatedAt ? new Date(payload.updatedAt) : null;

  els.updatedAt.textContent = updated && !Number.isNaN(updated.getTime())
    ? `Data refreshed: ${updated.toLocaleString()}`
    : "Using sample data";

  applyFilters();
}

bindEvents();
init();
