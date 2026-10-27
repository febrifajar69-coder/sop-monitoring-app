/**
 * ============================================================================
 * GOOGLE APPS SCRIPT API BRIDGE - SPECIAL ORDER PART (SOP) & MONITORING SA
 * PT. AGUNG AUTOMALL GIANYAR (AGUNG TOYOTA GIANYAR)
 *
 * Fitur:
 * 1. Pengiriman Multi-Item Part ke Sheet SA (Jarak 1 Baris Kosong dari Baris Terakhir)
 * 2. Update NEW ETA (Kolom M) & ATA (Kolom J) per masing-masing Item Part
 * 3. Update Follow Up 1, 2, 3 (Kolom N, O, P) & Status Kolom Q (NOT FIX, IN PROCESS, ARRIVAL, BO)
 * 4. Reminder Email H+7 Desain Resmi Agung Toyota Gianyar (Design By : FEB)
 *    Otomatis dikirim dari febrifajar69@gmail.com ke Email SA + CC Kepala Bengkel (andicka.nengah@gmail.com)
 * ============================================================================
 */

const SPREADSHEET_FORM_ID = '12PjXEGd8Z52O40lB-_nA89vJH6wXSneBmBsSmDYlchk';
const SPREADSHEET_MONITORING_ID = '1khVp8XaG1daE589qIEKp-NwcF17hXNkaHw4vX2Cp9wU';
const VALID_SA_SHEETS = ['AJS', 'AYU', 'FIK', 'WBN', 'OTHER'];
const VALID_STATUS_LIST = ['NOT FIX', 'IN PROCESS', 'ARRIVAL', 'BO'];
const EMAIL_CONFIG_PROP_KEY = 'SOP_SA_EMAIL_CONFIG_JSON';

const DEFAULT_SENDER_EMAIL = 'febrifajar69@gmail.com';
const DEFAULT_KABENG_EMAIL = 'andicka.nengah@gmail.com';

/**
 * Menangani request GET dari Aplikasi Web (Vercel / Browser)
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || 'getMonitoring';

    if (action === 'lookupCustomer') {
      return jsonResponse(lookupCustomerByNopol(params.nopol || ''));
    }

    if (action === 'getMonitoring') {
      const saFilter = (params.sa || 'ALL').toUpperCase();
      return jsonResponse(getMonitoringData(saFilter));
    }

    if (action === 'getEmailSettings') {
      return jsonResponse({
        status: 'ok',
        emailConfig: getEmailConfig(),
        triggerActive: isDailyTriggerInstalled()
      });
    }

    return jsonResponse({ status: 'ok', message: 'SOP & Monitoring SA API aktif.' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Menangani request POST dari Aplikasi Web (Vercel / Browser)
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter && e.parameter.payload) {
      payload = JSON.parse(e.parameter.payload);
    }

    const action = payload.action;

    if (action === 'submitOrder') {
      return jsonResponse(submitOrderToMonitoring(payload.order));
    }

    if (action === 'updateFollowUp') {
      return jsonResponse(updateFollowUpBySA(payload));
    }

    if (action === 'cleanupGhostRows') {
      return jsonResponse(bersihkanBarisKosongMonitoring(payload.sheetName));
    }

    if (action === 'moveOrderToJobDone') {
      return jsonResponse(moveOrderToJobDone(payload));
    }

    if (action === 'deleteCancelledOrder') {
      return jsonResponse(deleteCancelledOrderFromMonitoring(payload));
    }

    if (action === 'saveEmailSettings') {
      return jsonResponse(saveEmailConfig(payload.emailConfig, payload.enableAutoTrigger));
    }

    if (action === 'runReminderNow') {
      return jsonResponse(jalankanReminderH7Otomatis(true));
    }

    if (action === 'sendTestEmail') {
      return jsonResponse(sendTestEmailToSa(payload.targetSa, payload.targetName, payload.targetEmail));
    }

    if (action === 'getUsers') {
      return jsonResponse(getUsersList());
    }

    if (action === 'saveUsers') {
      return jsonResponse(saveUsersList(payload.users));
    }

    return jsonResponse({ status: 'error', message: 'Action tidak dikenali: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * ============================================================================
 * MANAJEMEN PENGGUNA (USERS & AUTENTIKASI LOGIN SA / KABENG / PARTMAN)
 * ============================================================================
 */
const USERS_PROP_KEY = 'SOP_USERS_JSON_V1';

function getUsersList() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(USERS_PROP_KEY);
  if (raw) {
    try {
      return { status: 'ok', users: JSON.parse(raw) };
    } catch (e) {}
  }
  return { status: 'ok', users: null };
}

function saveUsersList(users) {
  if (!Array.isArray(users)) {
    return { status: 'error', message: 'Daftar user harus berupa array.' };
  }
  const props = PropertiesService.getScriptProperties();
  props.setProperty(USERS_PROP_KEY, JSON.stringify(users));
  return { status: 'ok', message: 'Daftar pengguna berhasil disimpan di server.' };
}

/**
 * ============================================================================
 * MANAJEMEN ALAMAT EMAIL SA & KEPALA BENGKEL (TERSIMPAN DI SCRIPT PROPERTIES)
 * ============================================================================
 */
function getEmailConfig() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(EMAIL_CONFIG_PROP_KEY);
  const defaultList = [
    { code: 'AJS', name: 'AJS', email: '', active: true, isMain: true },
    { code: 'AYU', name: 'AYU', email: '', active: true, isMain: true },
    { code: 'FIK', name: 'FIK', email: '', active: true, isMain: true },
    { code: 'WBN', name: 'WBN', email: '', active: true, isMain: true },
    { code: 'OTHER', name: 'PIC OTHER', email: '', active: true, isMain: true }
  ];

  if (!raw) {
    return {
      reminderDays: 7,
      sendHourWita: 8,
      senderEmail: DEFAULT_SENDER_EMAIL,
      kabengEmail: DEFAULT_KABENG_EMAIL,
      appUrl: '',
      saEmails: defaultList
    };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.saEmails)) parsed.saEmails = defaultList;
    return {
      reminderDays: Number(parsed.reminderDays) || 7,
      sendHourWita: parsed.sendHourWita !== undefined ? Number(parsed.sendHourWita) : 8,
      senderEmail: parsed.senderEmail || DEFAULT_SENDER_EMAIL,
      kabengEmail: parsed.kabengEmail || DEFAULT_KABENG_EMAIL,
      appUrl: parsed.appUrl || '',
      saEmails: parsed.saEmails
    };
  } catch (e) {
    return {
      reminderDays: 7,
      sendHourWita: 8,
      senderEmail: DEFAULT_SENDER_EMAIL,
      kabengEmail: DEFAULT_KABENG_EMAIL,
      appUrl: '',
      saEmails: defaultList
    };
  }
}

function saveEmailConfig(newConfig, enableAutoTrigger) {
  if (!newConfig || !Array.isArray(newConfig.saEmails)) {
    return { status: 'error', message: 'Format pengaturan email tidak valid.' };
  }

  const cleanedEmails = newConfig.saEmails
    .map(function(item) {
      return {
        code: String(item.code || '').trim().toUpperCase(),
        name: String(item.name || item.code || '').trim(),
        email: String(item.email || '').trim(),
        active: item.active !== false,
        isMain: ['AJS', 'AYU', 'FIK', 'WBN', 'OTHER'].indexOf(String(item.code || '').trim().toUpperCase()) !== -1
      };
    })
    .filter(function(item) { return item.code !== ''; });

  const configToSave = {
    reminderDays: Number(newConfig.reminderDays) || 7,
    sendHourWita: newConfig.sendHourWita !== undefined ? Number(newConfig.sendHourWita) : 8,
    senderEmail: String(newConfig.senderEmail || DEFAULT_SENDER_EMAIL).trim(),
    kabengEmail: String(newConfig.kabengEmail || DEFAULT_KABENG_EMAIL).trim(),
    appUrl: String(newConfig.appUrl || '').trim(),
    saEmails: cleanedEmails
  };

  PropertiesService.getScriptProperties().setProperty(
    EMAIL_CONFIG_PROP_KEY,
    JSON.stringify(configToSave)
  );

  let triggerMsg = '';
  if (enableAutoTrigger) {
    pasangTriggerHarianOtomatis(configToSave.sendHourWita);
    triggerMsg = ' & Jadwal Reminder Harian Otomatis telah diaktifkan.';
  }

  return {
    status: 'ok',
    message: 'Daftar email SA & Kepala Bengkel (' + configToSave.kabengEmail + ') berhasil disimpan' + triggerMsg,
    emailConfig: configToSave,
    triggerActive: isDailyTriggerInstalled()
  };
}

function isDailyTriggerInstalled() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'jalankanReminderH7Otomatis') {
        return true;
      }
    }
  } catch (e) {}
  return false;
}

function pasangTriggerHarianOtomatis(hour) {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'jalankanReminderH7Otomatis') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
    const targetHour = (hour !== undefined && hour >= 0 && hour <= 23) ? hour : 8;
    ScriptApp.newTrigger('jalankanReminderH7Otomatis')
      .timeBased()
      .everyDays(1)
      .atHour(targetHour)
      .create();
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Membangun HTML Email Persis Sesuai Desain "AGUNG TOYOTA GIANYAR - Design By : FEB"
 */
function buildAgungToyotaReminderEmailHtml(params) {
  const saName = params.saName || 'Service Advisor';
  const nopol = params.nopol || '-';
  const customerName = params.customerName || '-';
  const arrivalDate = params.arrivalDate || '-';
  const lastFuDate = params.lastFuDate || '-';
  const lastFuResult = params.lastFuResult || '-';
  const appUrl = params.appUrl || '';

  const buttonHtml = appUrl
    ? '<div style="margin-top:20px;text-align:center;">' +
        '<a href="' + appUrl + '" style="background:#047857;color:#ffffff;padding:11px 22px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;display:inline-block;">Buka Aplikasi Monitoring SOP</a>' +
      '</div>'
    : '';

  return (
    '<div style="font-family:\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d1d5db;border-radius:10px;overflow:hidden;color:#1e293b;">' +
      '<!-- HEADER BANNER HIJAU AGUNG TOYOTA GIANYAR -->' +
      '<div style="background:linear-gradient(135deg,#064e3b 0%,#047857 60%,#10b981 100%);padding:26px 28px;color:#ffffff;position:relative;">' +
        '<div style="font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#a7f3d0;font-weight:600;margin-bottom:4px;">AUTHORIZED DEALER CRM SYSTEM</div>' +
        '<div style="font-size:26px;font-weight:800;letter-spacing:0.5px;margin-bottom:4px;color:#ffffff;">AGUNG TOYOTA GIANYAR</div>' +
        '<div style="font-size:13.5px;color:#ecfdf5;font-weight:400;">Pengingat Follow Up Kedatangan Part (Notifikasi Sales)</div>' +
      '</div>' +

      '<!-- BODY CONTENT -->' +
      '<div style="padding:26px 28px;">' +
        '<div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:18px;">' +
          '🔔 [REMINDER FOLLOW UP KEDATANGAN PART - AGUNG TOYOTA GIANYAR]' +
        '</div>' +

        '<div style="font-size:14.5px;color:#1e293b;margin-bottom:6px;">' +
          'Halo <strong>' + saName + ',</strong>' +
        '</div>' +
        '<div style="font-size:14px;color:#334155;margin-bottom:18px;">' +
          'Berikut informasi kedatangan part untuk pelanggan Anda yang perlu di-follow up:' +
        '</div>' +

        '<!-- KOTAK INFORMASI PELANGGAN & PART -->' +
        '<div style="background:#f0fdf9;border:1px solid #ccfbf1;border-radius:12px;padding:8px 18px;margin-bottom:20px;">' +
          '<table style="width:100%;border-collapse:collapse;font-size:13.5px;color:#1e293b;">' +
            '<tr style="border-bottom:1px solid #d1fae5;">' +
              '<td style="padding:11px 6px;width:28px;font-size:16px;">🚗</td>' +
              '<td style="padding:11px 6px;width:195px;color:#475569;">Nomer Polisi</td>' +
              '<td style="padding:11px 6px;width:15px;color:#475569;">:</td>' +
              '<td style="padding:11px 6px;font-weight:700;color:#0f172a;">' + nopol + '</td>' +
            '</tr>' +
            '<tr style="border-bottom:1px solid #d1fae5;">' +
              '<td style="padding:11px 6px;font-size:16px;">👤</td>' +
              '<td style="padding:11px 6px;color:#475569;">Nama Customer</td>' +
              '<td style="padding:11px 6px;color:#475569;">:</td>' +
              '<td style="padding:11px 6px;font-weight:700;color:#0f172a;">' + customerName + '</td>' +
            '</tr>' +
            '<tr style="border-bottom:1px solid #d1fae5;">' +
              '<td style="padding:11px 6px;font-size:16px;">📦</td>' +
              '<td style="padding:11px 6px;color:#475569;">Tanggal kedatangan Part</td>' +
              '<td style="padding:11px 6px;color:#475569;">:</td>' +
              '<td style="padding:11px 6px;font-weight:700;color:#0f172a;">' + arrivalDate + '</td>' +
            '</tr>' +
            '<tr style="border-bottom:1px solid #d1fae5;">' +
              '<td style="padding:11px 6px;font-size:16px;">📅</td>' +
              '<td style="padding:11px 6px;color:#475569;">Tanggal Follow Up terakhir</td>' +
              '<td style="padding:11px 6px;color:#475569;">:</td>' +
              '<td style="padding:11px 6px;font-weight:700;color:#0f172a;">' + lastFuDate + '</td>' +
            '</tr>' +
            '<tr>' +
              '<td style="padding:11px 6px;font-size:16px;">💬</td>' +
              '<td style="padding:11px 6px;color:#475569;">Hasil follow up terakhir</td>' +
              '<td style="padding:11px 6px;color:#475569;">:</td>' +
              '<td style="padding:11px 6px;font-weight:700;color:#0f172a;">' + lastFuResult + '</td>' +
            '</tr>' +
          '</table>' +
        '</div>' +

        '<div style="font-size:14px;color:#334155;line-height:1.55;">' +
          'Mohon segera melakukan follow up kepada pelanggan untuk memberikan informasi terbaru mengenai kedatangan part tersebut.' +
        '</div>' +
        buttonHtml +
      '</div>' +

      '<!-- FOOTER -->' +
      '<div style="background:#f0fdf4;border-top:1px solid #bbf7d0;padding:13px 28px;font-size:12px;color:#475569;">' +
        '<table style="width:100%;border-collapse:collapse;">' +
          '<tr>' +
            '<td style="text-align:left;color:#475569;">' +
              '<strong style="color:#065f46;">Agung Toyota Gianyar</strong> &bull; Jl. Bypass Dharma Giri, Gianyar, Bali' +
            '</td>' +
            '<td style="text-align:right;color:#64748b;">' +
              '| &nbsp; Design By : <strong style="color:#065f46;">FEB</strong>' +
            '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +
    '</div>'
  );
}

/**
 * Mengambil peta NOPOL -> Nama Customer dari Sheet RAW agar email reminder
 * selalu menampilkan Nama Customer dengan lengkap
 */
function buildCustomerNameMapByNopols(nopolsMap) {
  const result = {};
  const keys = Object.keys(nopolsMap || {});
  if (keys.length === 0) return result;

  try {
    const ssForm = SpreadsheetApp.openById(SPREADSHEET_FORM_ID);
    const rawSheet = ssForm.getSheetByName('RAW');
    if (!rawSheet) return result;

    const lastRow = rawSheet.getLastRow();
    if (lastRow < 2) return result;

    const data = rawSheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (let i = 0; i < data.length; i++) {
      const nopol = String(data[i][0] || '').trim().toUpperCase();
      if (nopol && nopolsMap[nopol] && !result[nopol]) {
        result[nopol] = String(data[i][1] || '').trim();
      }
    }
  } catch (e) {}
  return result;
}

/**
 * Fungsi pengecekan H+7 otomatis & pengiriman email ke SA + CC Kepala Bengkel (andicka.nengah@gmail.com)
 */
function jalankanReminderH7Otomatis(isManualRun) {
  const config = getEmailConfig();
  const reminderDays = Number(config.reminderDays) || 7;
  const kabengEmail = String(config.kabengEmail || DEFAULT_KABENG_EMAIL).trim();
  const emailMap = {};

  (config.saEmails || []).forEach(function(entry) {
    if (entry.active && entry.email) {
      emailMap[String(entry.code).toUpperCase()] = {
        email: String(entry.email).trim(),
        name: entry.name || entry.code
      };
    }
  });

  const ssMon = SpreadsheetApp.openById(SPREADSHEET_MONITORING_ID);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = Utilities.formatDate(today, Session.getScriptTimeZone() || 'Asia/Makassar', 'yyyy-MM-dd');

  const dueOrders = [];
  const neededNopols = {};

  VALID_SA_SHEETS.forEach(function(sheetName) {
    const sheet = ssMon.getSheetByName(sheetName);
    if (!sheet) return;

    const lastRow = getTrueLastDataRow(sheet, false);
    if (lastRow < 9) return;

    const numRows = lastRow - 8;
    const displayValues = sheet.getRange(9, 1, numRows, 18).getDisplayValues();
    const fuNotes = sheet.getRange(9, 14, numRows, 3).getNotes();

    let lastValidNopol = '';
    const processedNopolInSheet = {};

    for (let i = 0; i < displayValues.length; i++) {
      const rowNum = i + 9;
      const d = displayValues[i];
      const noteRow = fuNotes[i];

      const rawNopol = String(d[0] || '').trim();
      const partNo = String(d[3] || '').trim();
      const partName = String(d[4] || '').trim();

      if (!rawNopol && !partNo && !partName) {
        lastValidNopol = '';
        continue;
      }

      const nopol = (rawNopol || lastValidNopol).toUpperCase();
      if (!nopol) continue;
      lastValidNopol = nopol;

      if (processedNopolInSheet[nopol]) continue;

      const etaText = String(d[7] || '').trim();
      const ataText = String(d[9] || '').trim();
      const newEtaText = String(d[12] || '').trim();
      const fu1Text = String(d[13] || '').trim();
      const fu2Text = String(d[14] || '').trim();
      const fu3Text = String(d[15] || '').trim();
      let saPic = String(d[17] || '').trim().toUpperCase();
      if (!saPic || saPic === '#REF!') saPic = sheetName;

      const arrivalDisplay = ataText || newEtaText || etaText || '-';
      const noteFu1 = String(noteRow[0] || '');
      const noteFu2 = String(noteRow[1] || '');

      // Cek H+7 sejak Follow Up 1 (jika Follow Up 2 masih kosong)
      if (fu1Text && !fu2Text) {
        const meta1 = parseFuNoteMeta(noteFu1);
        if (meta1.date) {
          const diffDays = Math.floor((today.getTime() - meta1.date.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= reminderDays && (!meta1.remindedDate || isManualRun)) {
            processedNopolInSheet[nopol] = true;
            neededNopols[nopol] = true;
            const targetKey = (sheetName === 'OTHER' && emailMap[saPic]) ? saPic : sheetName;
            dueOrders.push({
              sheetName: sheetName,
              rowNumber: rowNum,
              saCode: targetKey,
              saPic: saPic,
              nopol: nopol,
              arrivalDate: arrivalDisplay,
              lastFuDate: formatIsoToSlash(meta1.dateStr),
              lastFuResult: fu1Text,
              noteColIndex: 14,
              existingMeta: meta1
            });
          }
        }
      }
      // Cek H+7 sejak Follow Up 2 (jika Follow Up 3 masih kosong)
      else if (fu1Text && fu2Text && !fu3Text) {
        const meta2 = parseFuNoteMeta(noteFu2);
        if (meta2.date) {
          const diffDays2 = Math.floor((today.getTime() - meta2.date.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays2 >= reminderDays && (!meta2.remindedDate || isManualRun)) {
            processedNopolInSheet[nopol] = true;
            neededNopols[nopol] = true;
            const targetKey = (sheetName === 'OTHER' && emailMap[saPic]) ? saPic : sheetName;
            dueOrders.push({
              sheetName: sheetName,
              rowNumber: rowNum,
              saCode: targetKey,
              saPic: saPic,
              nopol: nopol,
              arrivalDate: arrivalDisplay,
              lastFuDate: formatIsoToSlash(meta2.dateStr),
              lastFuResult: fu2Text,
              noteColIndex: 15,
              existingMeta: meta2
            });
          }
        }
      }
    }
  });

  const customerMap = buildCustomerNameMapByNopols(neededNopols);
  const sentDetails = [];

  dueOrders.forEach(function(order) {
    const recipientInfo = emailMap[order.saCode] || emailMap['OTHER'];
    const toEmail = (recipientInfo && recipientInfo.email) ? recipientInfo.email : '';
    if (!toEmail && !kabengEmail) return;

    const saDisplayName = (recipientInfo && recipientInfo.name) ? recipientInfo.name : order.saPic;
    const customerName = customerMap[order.nopol] || '-';

    const htmlBody = buildAgungToyotaReminderEmailHtml({
      saName: saDisplayName,
      nopol: order.nopol,
      customerName: customerName,
      arrivalDate: order.arrivalDate,
      lastFuDate: order.lastFuDate,
      lastFuResult: order.lastFuResult,
      appUrl: config.appUrl
    });

    const mailOptions = {
      to: toEmail || kabengEmail,
      subject: '[REMINDER FOLLOW UP KEDATANGAN PART - AGUNG TOYOTA GIANYAR] ' + order.nopol,
      htmlBody: htmlBody,
      name: 'Agung Toyota Gianyar CRM'
    };

    // Selalu kirimkan (CC) ke Kepala Bengkel (andicka.nengah@gmail.com)
    if (toEmail && kabengEmail && toEmail.toLowerCase() !== kabengEmail.toLowerCase()) {
      mailOptions.cc = kabengEmail;
    }

    MailApp.sendEmail(mailOptions);

    const sh = ssMon.getSheetByName(order.sheetName);
    if (sh) {
      sh.getRange(order.rowNumber, order.noteColIndex).setNote(buildFuNoteMeta(order.existingMeta.dateStr, todayIso));
    }

    sentDetails.push(order.nopol + ' -> ' + (toEmail || kabengEmail) + (mailOptions.cc ? ' (CC Kabeng: ' + mailOptions.cc + ')' : ''));
  });

  return {
    status: 'ok',
    totalOrderDue: dueOrders.length,
    sentCount: sentDetails.length,
    details: sentDetails,
    message: sentDetails.length > 0
      ? 'Berhasil mengirim ' + sentDetails.length + ' email reminder (+ CC Kepala Bengkel): ' + sentDetails.join(', ')
      : 'Pengecekan selesai. Belum ada order yang jatuh tempo H+' + reminderDays + ' hari ini.'
  };
}

/**
 * Mengirim Test Email dengan Template Resmi Agung Toyota Gianyar ke SA + CC Kepala Bengkel
 */
function sendTestEmailToSa(targetSa, targetName, targetEmail) {
  const cleanEmail = String(targetEmail || '').trim();
  const cleanSa = String(targetSa || 'AJS').trim().toUpperCase();
  const displaySaName = String(targetName || cleanSa).trim();

  if (!cleanEmail || cleanEmail.indexOf('@') === -1) {
    return { status: 'error', message: 'Masukkan alamat email SA yang valid terlebih dahulu.' };
  }

  const config = getEmailConfig();
  const kabengEmail = String(config.kabengEmail || DEFAULT_KABENG_EMAIL).trim();
  const todaySlash = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Makassar', 'dd/MM/yyyy');

  const htmlBody = buildAgungToyotaReminderEmailHtml({
    saName: displaySaName,
    nopol: 'DK-1640-LN (CONTOH TEST)',
    customerName: 'ALASKA WARIH SAMUDRA PT.',
    arrivalDate: todaySlash,
    lastFuDate: todaySlash,
    lastFuResult: 'BOOKING PASANG SEKALIAN SERVIS',
    appUrl: config.appUrl
  });

  const mailOptions = {
    to: cleanEmail,
    subject: '[REMINDER FOLLOW UP KEDATANGAN PART - AGUNG TOYOTA GIANYAR] DK-1640-LN',
    htmlBody: htmlBody,
    name: 'Agung Toyota Gianyar CRM'
  };

  if (kabengEmail && cleanEmail.toLowerCase() !== kabengEmail.toLowerCase()) {
    mailOptions.cc = kabengEmail;
  }

  MailApp.sendEmail(mailOptions);

  return {
    status: 'ok',
    message: 'Email Reminder (Template Agung Toyota Gianyar) berhasil dikirim ke ' + cleanEmail + (mailOptions.cc ? ' & CC ke Kepala Bengkel (' + mailOptions.cc + ')' : '') + '!'
  };
}

function formatIsoToSlash(isoStr) {
  if (!isoStr) return '-';
  const parts = String(isoStr).split('-');
  if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return isoStr;
}

function parseFuNoteMeta(noteStr) {
  const result = { date: null, dateStr: '', remindedDate: '' };
  if (!noteStr) return result;
  const dateMatch = String(noteStr).match(/FU_DATE:(\d{4}-\d{2}-\d{2})/);
  const remMatch = String(noteStr).match(/REMINDED:(\d{4}-\d{2}-\d{2})/);
  if (dateMatch && dateMatch[1]) {
    result.dateStr = dateMatch[1];
    const parts = dateMatch[1].split('-');
    result.date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  if (remMatch && remMatch[1]) {
    result.remindedDate = remMatch[1];
  }
  return result;
}

function buildFuNoteMeta(dateStr, remindedStr) {
  let note = 'FU_DATE:' + dateStr;
  if (remindedStr) {
    note += '\nREMINDED:' + remindedStr;
  }
  return note;
}

/**
 * Mencari baris terakhir yang BENAR-BENAR terisi data pada Kolom A (NOPOL), D (PART NO), atau E (PART NAME).
 */
function getTrueLastDataRow(sheet, relocateStray) {
  const maxSheetRow = sheet.getLastRow();
  if (maxSheetRow < 9) return 8;

  const scanLimit = Math.min(maxSheetRow, 1500);
  const numScanRows = scanLimit - 8;
  const colAtoE = sheet.getRange(9, 1, numScanRows, 5).getDisplayValues();

  let mainLastRow = 8;
  const strayRowNumbers = [];

  for (let i = 0; i < colAtoE.length; i++) {
    const rNum = i + 9;
    const nopol = String(colAtoE[i][0] || '').trim();
    const partNo = String(colAtoE[i][3] || '').trim();
    const partName = String(colAtoE[i][4] || '').trim();

    if (nopol !== '' || partNo !== '' || partName !== '') {
      if (mainLastRow >= 9 && (rNum - mainLastRow) > 30) {
        strayRowNumbers.push(rNum);
      } else {
        mainLastRow = rNum;
      }
    }
  }

  if (relocateStray && strayRowNumbers.length > 0) {
    const hasTotalArrayFormula = Boolean(sheet.getRange('I8').getFormula());
    const hasSaArrayFormula = Boolean(sheet.getRange('R8').getFormula());

    for (let s = 0; s < strayRowNumbers.length; s++) {
      const oldRow = strayRowNumbers[s];
      const newRow = mainLastRow >= 9 ? (mainLastRow + 2) : 9;

      const oldVals = sheet.getRange(oldRow, 1, 1, 18).getValues()[0];
      sheet.getRange(newRow, 1, 1, 8).setValues([oldVals.slice(0, 8)]);
      sheet.getRange(newRow, 2).setNumberFormat('dd/MM/yyyy');
      if (oldVals[7]) sheet.getRange(newRow, 8).setNumberFormat('dd/MM/yyyy');

      if (!hasTotalArrayFormula) {
        sheet.getRange(newRow, 9).setFormula('=F' + newRow + '*G' + newRow);
      }
      sheet.getRange(newRow, 10, 1, 8).setValues([oldVals.slice(9, 17)]);
      if (!hasSaArrayFormula) {
        sheet.getRange(newRow, 18).setValue(oldVals[17]);
      }

      sheet.getRange(oldRow, 1, 1, 8).clearContent();
      sheet.getRange(oldRow, 10, 1, 8).clearContent();
      if (!hasTotalArrayFormula) sheet.getRange(oldRow, 9).clearContent();
      if (!hasSaArrayFormula) sheet.getRange(oldRow, 18).clearContent();

      mainLastRow = newRow;
    }
  }

  return mainLastRow;
}

/**
 * Mencari data customer (Nama, No Telp, Alamat) dari Sheet RAW di Spreadsheet 1
 */
function lookupCustomerByNopol(nopolQuery) {
  const cleanQuery = String(nopolQuery || '').trim().toUpperCase();
  if (!cleanQuery) {
    return { status: 'ok', found: false, matches: [] };
  }

  const ssForm = SpreadsheetApp.openById(SPREADSHEET_FORM_ID);
  const rawSheet = ssForm.getSheetByName('RAW');
  if (!rawSheet) {
    return { status: 'error', message: 'Sheet RAW tidak ditemukan di Spreadsheet 1' };
  }

  const lastRow = rawSheet.getLastRow();
  if (lastRow < 2) {
    return { status: 'ok', found: false, matches: [] };
  }

  const data = rawSheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const matches = [];
  let exactMatch = null;

  for (let i = 0; i < data.length; i++) {
    const nopol = String(data[i][0] || '').trim().toUpperCase();
    if (!nopol) continue;

    if (nopol === cleanQuery) {
      exactMatch = {
        nopol: String(data[i][0]).trim(),
        customerName: String(data[i][1] || '').trim(),
        phone: formatPhone(data[i][2]),
        address: String(data[i][3] || '').trim()
      };
      matches.unshift(exactMatch);
      if (matches.length >= 15) break;
    } else if (nopol.indexOf(cleanQuery) !== -1 && matches.length < 15) {
      matches.push({
        nopol: String(data[i][0]).trim(),
        customerName: String(data[i][1] || '').trim(),
        phone: formatPhone(data[i][2]),
        address: String(data[i][3] || '').trim()
      });
    }
  }

  return {
    status: 'ok',
    found: matches.length > 0,
    exact: exactMatch || (matches[0] || null),
    matches: matches
  };
}

/**
 * Mengambil seluruh data Monitoring dari Sheet AJS, AYU, FIK, WBN, dan OTHER
 * Termasuk NEW ETA (Kolom M) dan ATA (Kolom J) per masing-masing item part!
 */
function getMonitoringData(saFilter) {
  const ssMon = SpreadsheetApp.openById(SPREADSHEET_MONITORING_ID);
  const targetSheets = (saFilter && VALID_SA_SHEETS.indexOf(saFilter) !== -1)
    ? [saFilter]
    : VALID_SA_SHEETS;

  const items = [];

  targetSheets.forEach(function(sheetName) {
    const sheet = ssMon.getSheetByName(sheetName);
    if (!sheet) return;

    const lastRow = getTrueLastDataRow(sheet, true);
    if (lastRow < 9) return;

    const numRows = lastRow - 8;
    const values = sheet.getRange(9, 1, numRows, 18).getValues();
    const displayValues = sheet.getRange(9, 1, numRows, 18).getDisplayValues();
    const fuNotes = sheet.getRange(9, 14, numRows, 3).getNotes();

    let lastValidNopol = '';
    let lastOrderDate = '';
    let lastOrderNo = '';

    for (let i = 0; i < values.length; i++) {
      const rowNum = i + 9;
      const r = values[i];
      const d = displayValues[i];
      const nRow = fuNotes[i];

      const rawNopol = String(d[0] || '').trim();
      const partNo = String(d[3] || '').trim();
      const partName = String(d[4] || '').trim();

      if (!rawNopol && !partNo && !partName) {
        lastValidNopol = '';
        continue;
      }

      const nopol = rawNopol || lastValidNopol;
      if (!nopol) continue;
      lastValidNopol = nopol;

      const orderDate = String(d[1] || lastOrderDate || '').trim();
      const orderNo = String(d[2] || lastOrderNo || '').trim();
      if (d[1]) lastOrderDate = orderDate;
      if (d[2]) lastOrderNo = orderNo;

      const qty = parseFloat(r[5]) || 1;
      const price = parseFloat(r[6]) || 0;
      const total = parseFloat(r[8]) || (qty * price);

      let saPic = String(d[17] || '').trim();
      if (!saPic || saPic === '#REF!') {
        saPic = sheetName;
      }

      const meta1 = parseFuNoteMeta(nRow[0]);
      const meta2 = parseFuNoteMeta(nRow[1]);

      const rawAta = String(d[9] || '').trim();
      let rowStatus = String(d[16] || '').trim().toUpperCase();

      // Aturan Otomatis: jika part sudah ada ATA, status ordernya otomatis jadi 'ARRIVAL'
      if (rawAta) {
        if (rowStatus !== 'ARRIVAL') {
          rowStatus = 'ARRIVAL';
          try {
            sheet.getRange(rowNum, 17).setValue('ARRIVAL');
          } catch (eArr) {}
        }
      } else if (!rowStatus) {
        rowStatus = 'IN PROCESS';
      }

      items.push({
        id: sheetName + '-R' + rowNum,
        sheetName: sheetName,
        rowNumber: rowNum,
        nopol: nopol,
        orderDate: orderDate,
        orderNo: orderNo,
        partNo: partNo || '-',
        partName: partName || '-',
        qty: qty,
        price: price,
        eta: d[7] || '',
        total: total,
        ata: d[9] || '',
        note: d[10] || '',
        dp: d[11] || '',
        newEta: d[12] || '',
        etaBo: d[12] || '',
        followUp1: d[13] || '',
        followUp2: d[14] || '',
        followUp3: d[15] || '',
        fu1Date: meta1.dateStr || '',
        fu2Date: meta2.dateStr || '',
        status: rowStatus,
        saPic: saPic
      });
    }
  });

  return {
    status: 'ok',
    updatedAt: new Date().toISOString(),
    items: items
  };
}

/**
 * Mengirim data Form Order (multi-item part) ke Spreadsheet 2 (Monitoring)
 */
function submitOrderToMonitoring(order) {
  if (!order || !order.nopol || !order.items || !order.items.length) {
    return { status: 'error', message: 'Data Nomor Polisi dan minimal 1 Item Part wajib diisi.' };
  }

  const rawSa = String(order.sa || 'OTHER').trim().toUpperCase();
  const targetSheetName = (['AJS', 'AYU', 'FIK', 'WBN'].indexOf(rawSa) !== -1) ? rawSa : 'OTHER';

  const picNameForColR = (targetSheetName === 'OTHER')
    ? String(order.picOther || order.sa || 'OTHER').trim().toUpperCase()
    : targetSheetName;

  const orderStatus = String(order.status || 'IN PROCESS').trim().toUpperCase();

  const ssMon = SpreadsheetApp.openById(SPREADSHEET_MONITORING_ID);
  const sheet = ssMon.getSheetByName(targetSheetName);
  if (!sheet) {
    return { status: 'error', message: 'Sheet ' + targetSheetName + ' tidak ditemukan di Spreadsheet Monitoring.' };
  }

  if (targetSheetName === 'OTHER') {
    const r8Formula = sheet.getRange('R8').getFormula();
    if (r8Formula) {
      sheet.getRange('R8').clearContent();
    }
  }

  const hasTotalArrayFormula = Boolean(sheet.getRange('I8').getFormula());
  const hasSaArrayFormula = Boolean(sheet.getRange('R8').getFormula());

  const lastDataRow = getTrueLastDataRow(sheet, true);

  let startWriteRow = 9;
  if (lastDataRow >= 9) {
    const prevNopol = String(sheet.getRange(lastDataRow, 1).getDisplayValue() || '').trim().toUpperCase();
    const curNopol = String(order.nopol || '').trim().toUpperCase();
    startWriteRow = (prevNopol === curNopol) ? (lastDataRow + 1) : (lastDataRow + 2);
  }

  const orderDateVal = order.orderDate ? new Date(order.orderDate) : new Date();
  const etaVal = order.eta ? new Date(order.eta) : '';

  const insertedRows = [];

  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    const targetRow = startWriteRow + i;
    const qty = Number(item.qty) || 1;
    const price = Number(item.price) || 0;

    sheet.getRange(targetRow, 1, 1, 8).setValues([[
      String(order.nopol || '').trim().toUpperCase(),
      orderDateVal,
      String(order.orderNo || '').trim().toUpperCase(),
      String(item.partNo || '-').trim().toUpperCase(),
      String(item.partName || '').trim().toUpperCase(),
      qty,
      price,
      etaVal
    ]]);

    sheet.getRange(targetRow, 2).setNumberFormat('dd/MM/yyyy');
    if (etaVal) {
      sheet.getRange(targetRow, 8).setNumberFormat('dd mmm');
    }

    if (!hasTotalArrayFormula) {
      sheet.getRange(targetRow, 9).setFormula('=F' + targetRow + '*G' + targetRow);
    }

    sheet.getRange(targetRow, 11, 1, 2).setValues([[
      String(order.note || '').trim().toUpperCase(),
      String(order.dpStatus || 'NOT FIX').trim().toUpperCase()
    ]]);

    sheet.getRange(targetRow, 17).setValue(orderStatus);

    if (!hasSaArrayFormula || targetSheetName === 'OTHER') {
      sheet.getRange(targetRow, 18).setValue(picNameForColR);
    }

    insertedRows.push(targetRow);
  }

  try {
    syncToFormSpreadsheet(order, picNameForColR);
  } catch (syncErr) {}

  return {
    status: 'ok',
    message: 'Berhasil mengirim ' + order.items.length + ' item part (' + order.nopol + ') ke Sheet ' + targetSheetName + ' pada Baris ' + insertedRows.join(', ') + ' (Status: ' + orderStatus + ').',
    targetSheet: targetSheetName,
    pic: picNameForColR,
    insertedRows: insertedRows
  };
}

/**
 * Mengupdate Follow Up 1, 2, 3 (Kolom N, O, P), Status (Kolom Q),
 * serta NEW ETA (Kolom M) dan ATA (Kolom J) untuk masing-masing item part!
 */
function updateFollowUpBySA(payload) {
  const sheetName = String(payload.sheetName || '').trim().toUpperCase();
  const targetNopol = String(payload.nopol || '').trim().toUpperCase();
  const rawRowNumber = parseInt(payload.rowNumber, 10);

  if (VALID_SA_SHEETS.indexOf(sheetName) === -1) {
    return { status: 'error', message: 'Nama Sheet SA tidak valid: ' + sheetName };
  }

  const requestedRows = (Array.isArray(payload.rowNumbers) && payload.rowNumbers.length > 0)
    ? payload.rowNumbers.map(function(r) { return parseInt(r, 10); }).filter(function(r) { return r >= 9; })
    : (rawRowNumber >= 9 ? [rawRowNumber] : []);

  if (requestedRows.length === 0 && !targetNopol) {
    return { status: 'error', message: 'Nomor baris atau No. Polisi tidak valid.' };
  }

  const ssMon = SpreadsheetApp.openById(SPREADSHEET_MONITORING_ID);
  const sheet = ssMon.getSheetByName(sheetName);
  if (!sheet) {
    return { status: 'error', message: 'Sheet ' + sheetName + ' tidak ditemukan.' };
  }

  // VALIDASI KETAT:
  // Hanya baris yang benar-benar memiliki item part (Col D: Part No atau Col E: Part Name) yang boleh diupdate!
  let rowsToUpdate = [];

  if (requestedRows.length > 0) {
    rowsToUpdate = requestedRows.filter(function(rInt) {
      if (rInt < 9) return false;
      try {
        const checkPart = sheet.getRange(rInt, 4, 1, 2).getDisplayValues()[0];
        const hasPart = String(checkPart[0] || '').trim() !== '' || String(checkPart[1] || '').trim() !== '';
        return hasPart;
      } catch (e) {
        return true;
      }
    });
  }

  // Jika requestedRows kosong, scan berdasarkan targetNopol dengan validasi pemisah baris kosong
  if (rowsToUpdate.length === 0 && targetNopol) {
    const lastRow = sheet.getLastRow();
    if (lastRow >= 9) {
      const numRows = lastRow - 8;
      const dataCols = sheet.getRange(9, 1, numRows, 5).getDisplayValues(); // Col A s/d E
      let curNopol = '';
      for (let i = 0; i < numRows; i++) {
        const rowNopol = String(dataCols[i][0] || '').trim().toUpperCase();
        const partNo = String(dataCols[i][3] || '').trim();
        const partName = String(dataCols[i][4] || '').trim();

        // Jika baris kosong pemisah (tanpa nopol, tanpa part no, tanpa part name), putus grup!
        if (!rowNopol && !partNo && !partName) {
          curNopol = '';
          continue;
        }

        if (rowNopol) curNopol = rowNopol;

        // Hanya masukkan jika nopol cocok DAN baris memiliki part no atau part name!
        if (curNopol === targetNopol && (partNo || partName)) {
          rowsToUpdate.push(i + 9);
        }
      }
    }
  }

  if (rowsToUpdate.length === 0) {
    return { status: 'error', message: 'Tidak ada baris item part yang ditemukan untuk No. Polisi ' + (targetNopol || sheetName) };
  }

  const fu1 = String(payload.followUp1 || '').trim().toUpperCase();
  const fu2 = String(payload.followUp2 || '').trim().toUpperCase();
  const fu3 = String(payload.followUp3 || '').trim().toUpperCase();
  const orderNoVal = payload.orderNo !== undefined ? String(payload.orderNo || '').trim().toUpperCase() : undefined;
  const noteVal = payload.note !== undefined ? String(payload.note || '').trim().toUpperCase() : undefined;
  const dpVal = payload.dp ? String(payload.dp).trim().toUpperCase() : '';
  const statusVal = payload.status ? String(payload.status).trim().toUpperCase() : '';
  const todayIso = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Makassar', 'yyyy-MM-dd');

  // Peta update NEW ETA & ATA per baris item part (jika dikirim dari aplikasi)
  const itemEtaAtaMap = {};
  if (Array.isArray(payload.itemUpdates)) {
    payload.itemUpdates.forEach(function(iu) {
      if (iu && iu.rowNumber) {
        itemEtaAtaMap[parseInt(iu.rowNumber, 10)] = {
          newEta: iu.newEta !== undefined ? String(iu.newEta || '').trim() : undefined,
          ata: iu.ata !== undefined ? String(iu.ata || '').trim() : undefined,
          status: iu.status !== undefined ? String(iu.status || '').trim().toUpperCase() : undefined
        };
      }
    });
  }

  let recordedFu1Date = '';
  let recordedFu2Date = '';

  rowsToUpdate.forEach(function(rNum) {
    const rInt = parseInt(rNum, 10);
    if (rInt >= 9) {
      // 1. Update NEW ETA (Kolom M / 13) & ATA (Kolom J / 10) khusus untuk baris item part ini
      const itemUpd = itemEtaAtaMap[rInt];
      if (itemUpd) {
        if (itemUpd.ata !== undefined) {
          if (itemUpd.ata) {
            const parsedAta = parseFlexibleDate(itemUpd.ata);
            sheet.getRange(rInt, 10).setValue(parsedAta || itemUpd.ata);
            if (parsedAta) sheet.getRange(rInt, 10).setNumberFormat('dd mmm');
          } else {
            sheet.getRange(rInt, 10).clearContent();
          }
        }
        if (itemUpd.newEta !== undefined) {
          if (itemUpd.newEta) {
            const parsedNewEta = parseFlexibleDate(itemUpd.newEta);
            sheet.getRange(rInt, 13).setValue(parsedNewEta || itemUpd.newEta);
            if (parsedNewEta) sheet.getRange(rInt, 13).setNumberFormat('dd mmm');
          } else {
            sheet.getRange(rInt, 13).clearContent();
          }
        }
      }

      // 2. Update Follow Up 1, 2, 3 (Kolom N, O, P)
      const rangeFu = sheet.getRange(rInt, 14, 1, 3);
      const oldNotes = rangeFu.getNotes()[0];
      const meta1 = parseFuNoteMeta(oldNotes[0]);
      const meta2 = parseFuNoteMeta(oldNotes[1]);

      rangeFu.setValues([[fu1, fu2, fu3]]);

      if (fu1) {
        const d1 = meta1.dateStr || todayIso;
        recordedFu1Date = d1;
        sheet.getRange(rInt, 14).setNote(buildFuNoteMeta(d1, meta1.remindedDate));
      } else {
        sheet.getRange(rInt, 14).clearNote();
      }

      if (fu2) {
        const d2 = meta2.dateStr || todayIso;
        recordedFu2Date = d2;
        sheet.getRange(rInt, 15).setNote(buildFuNoteMeta(d2, meta2.remindedDate));
      } else {
        sheet.getRange(rInt, 15).clearNote();
      }

      // 3. Update Type / No. Order (Kolom C / 3) & Lokasi Rak / Note (Kolom K / 11)
      if (orderNoVal !== undefined) {
        sheet.getRange(rInt, 3).setValue(orderNoVal);
      }
      if (noteVal !== undefined) {
        sheet.getRange(rInt, 11).setValue(noteVal);
      }

      // 4. Update Status DP (Kolom L / 12: NOT FIX, LUNAS, DP, KNTRK, INAP, W/O DP)
      if (dpVal) {
        sheet.getRange(rInt, 12).setValue(dpVal);
      }

      // 5. Update Status Order (Kolom Q / 17: NOT FIX, IN PROCESS, ARRIVAL, BO)
      // Aturan Otomatis: Tiap part yang sudah ada ATA-nya, otomatis di spreadsheet status ordernya jadi 'ARRIVAL'!
      let partHasAta = false;
      if (itemUpd && itemUpd.ata !== undefined) {
        if (itemUpd.ata && String(itemUpd.ata).trim() !== '') {
          partHasAta = true;
        }
      } else {
        const existingAta = String(sheet.getRange(rInt, 10).getDisplayValue() || '').trim();
        if (existingAta) {
          partHasAta = true;
        }
      }

      if (partHasAta) {
        sheet.getRange(rInt, 17).setValue('ARRIVAL');
      } else if (itemUpd && itemUpd.status) {
        sheet.getRange(rInt, 17).setValue(itemUpd.status);
      } else if (statusVal) {
        sheet.getRange(rInt, 17).setValue(statusVal);
      }

      // 4. Khusus Sheet OTHER: update nama PIC manual di kolom R (18)
      if (sheetName === 'OTHER' && payload.saPic) {
        const r8Formula = sheet.getRange('R8').getFormula();
        if (r8Formula) sheet.getRange('R8').clearContent();
        sheet.getRange(rInt, 18).setValue(String(payload.saPic).trim().toUpperCase());
      }
    }
  });

  if (!isDailyTriggerInstalled()) {
    pasangTriggerHarianOtomatis(8);
  }

  return {
    status: 'ok',
    message: 'Perubahan Follow Up, Status, NEW ETA & ATA berhasil disimpan ke Sheet ' + sheetName + '.',
    sheetName: sheetName,
    updatedRows: rowsToUpdate,
    fu1Date: recordedFu1Date,
    fu2Date: recordedFu2Date
  };
}

/**
 * Membersihkan baris-baris kosong yang tidak memiliki No. Pol / Part No / Part Name,
 * namun kolom C (No Order), Kolom L (DP), atau Kolom Q (Status) terisi karena kesalahan loop sebelumnya.
 */
function bersihkanBarisKosongMonitoring(targetSheetName) {
  const ssMon = SpreadsheetApp.openById(SPREADSHEET_MONITORING_ID);
  const sheetsToClean = targetSheetName ? [targetSheetName] : VALID_SA_SHEETS;

  let totalCleaned = 0;
  sheetsToClean.forEach(function(sName) {
    const sheet = ssMon.getSheetByName(sName);
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    if (lastRow < 9) return;

    const numRows = lastRow - 8;
    const allData = sheet.getRange(9, 1, numRows, 18).getDisplayValues();

    for (let i = 0; i < numRows; i++) {
      const rowNum = i + 9;
      const nopol = String(allData[i][0] || '').trim();
      const partNo = String(allData[i][3] || '').trim();
      const partName = String(allData[i][4] || '').trim();

      // Jika baris kosong (tidak ada nopol, part no, dan part name)
      if (!nopol && !partNo && !partName) {
        const orderNo = String(allData[i][2] || '').trim();
        const dp = String(allData[i][11] || '').trim();
        const status = String(allData[i][16] || '').trim();

        if (orderNo || dp || status) {
          // Bersihkan Kolom C (3: No Order)
          sheet.getRange(rowNum, 3).clearContent();
          // Bersihkan Kolom K & L (11: Note, 12: DP)
          sheet.getRange(rowNum, 11, 1, 2).clearContent();
          // Bersihkan Kolom N, O, P, Q (14: FU1, 15: FU2, 16: FU3, 17: Status)
          sheet.getRange(rowNum, 14, 1, 4).clearContent();
          totalCleaned++;
        }
      }
    }
  });

  return {
    status: 'ok',
    message: 'Berhasil membersihkan ' + totalCleaned + ' baris kosong yang tidak valid.',
    cleanedRows: totalCleaned
  };
}

/**
 * Mencari baris terakhir yang benar-benar terisi data pada Sheet 'JOB DONE' (data mulai dari Baris 5)
 */
function getTrueLastRowJobDone(jobDoneSheet) {
  const maxRow = jobDoneSheet.getLastRow();
  if (maxRow < 5) return 4;

  const scanLimit = Math.min(maxRow, 3000);
  const numRows = scanLimit - 4;
  const colAtoE = jobDoneSheet.getRange(5, 1, numRows, 5).getDisplayValues();

  let lastRow = 4;
  for (let i = 0; i < colAtoE.length; i++) {
    const nopol = String(colAtoE[i][0] || '').trim();
    const partNo = String(colAtoE[i][3] || '').trim();
    const partName = String(colAtoE[i][4] || '').trim();
    if (nopol !== '' || partNo !== '' || partName !== '') {
      lastRow = i + 5;
    }
  }
  return lastRow;
}

/**
 * Memindahkan seluruh baris item part untuk 1 No. Polisi dari Sheet Monitoring SA
 * ke Sheet 'JOB DONE' (dengan jarak 1 baris kosong), lalu menghapusnya dari Sheet Monitoring SA.
 */
function moveOrderToJobDone(payload) {
  const sheetName = String(payload.sheetName || '').trim().toUpperCase();
  const targetNopol = String(payload.nopol || '').trim().toUpperCase();

  if (VALID_SA_SHEETS.indexOf(sheetName) === -1) {
    return { status: 'error', message: 'Nama Sheet SA tidak valid: ' + sheetName };
  }
  if (!targetNopol) {
    return { status: 'error', message: 'Nomor Polisi wajib disertakan untuk proses Job Done.' };
  }

  const ssMon = SpreadsheetApp.openById(SPREADSHEET_MONITORING_ID);
  const srcSheet = ssMon.getSheetByName(sheetName);
  const jobDoneSheet = ssMon.getSheetByName('JOB DONE');

  if (!srcSheet) {
    return { status: 'error', message: 'Sheet sumber ' + sheetName + ' tidak ditemukan.' };
  }
  if (!jobDoneSheet) {
    return { status: 'error', message: 'Sheet JOB DONE tidak ditemukan di Spreadsheet Monitoring.' };
  }

  // 1. Cari baris-baris milik Nopol tersebut di srcSheet
  let matchedRows = [];
  const requestedRows = Array.isArray(payload.rowNumbers)
    ? payload.rowNumbers.map(function(r) { return parseInt(r, 10); }).filter(function(r) { return r >= 9; })
    : [];

  const lastSrcRow = getTrueLastDataRow(srcSheet, false);
  if (lastSrcRow >= 9) {
    const numRows = lastSrcRow - 8;
    const disp = srcSheet.getRange(9, 1, numRows, 18).getDisplayValues();
    const rawVals = srcSheet.getRange(9, 1, numRows, 18).getValues();

    // Cek apakah requestedRows masih tepat mengarah ke targetNopol
    let requestedValid = false;
    if (requestedRows.length > 0) {
      const firstIdx = requestedRows[0] - 9;
      if (firstIdx >= 0 && firstIdx < disp.length) {
        const checkNopol = String(disp[firstIdx][0] || '').trim().toUpperCase();
        if (checkNopol === targetNopol) {
          requestedValid = true;
        }
      }
    }

    if (requestedValid) {
      matchedRows = requestedRows.slice().sort(function(a, b) { return a - b; });
    } else {
      // Jika baris bergeser karena penghapusan sebelumnya, cari grup baris yang sesuai dengan targetNopol
      let currentGroupNopol = '';
      for (let i = 0; i < disp.length; i++) {
        const rNum = i + 9;
        const rNopol = String(disp[i][0] || '').trim().toUpperCase();
        const rPartNo = String(disp[i][3] || '').trim();
        const rPartName = String(disp[i][4] || '').trim();

        if (!rNopol && !rPartNo && !rPartName) {
          currentGroupNopol = '';
          continue;
        }
        const effectiveNopol = rNopol || currentGroupNopol;
        if (!effectiveNopol) continue;
        currentGroupNopol = effectiveNopol;

        if (effectiveNopol === targetNopol) {
          matchedRows.push(rNum);
        } else if (matchedRows.length > 0) {
          break;
        }
      }
    }
  }

  // Kumpulkan baris data yang akan ditulis ke Sheet 'JOB DONE' (Kolom A s/d R = 18 kolom)
  const rowsToWriteToJobDone = [];
  if (matchedRows.length > 0) {
    let carryOrderDate = '';
    let carryOrderNo = '';
    for (let i = 0; i < matchedRows.length; i++) {
      const rNum = matchedRows[i];
      const rVal = srcSheet.getRange(rNum, 1, 1, 18).getValues()[0];
      const rDisp = srcSheet.getRange(rNum, 1, 1, 18).getDisplayValues()[0];

      if (rVal[1]) carryOrderDate = rVal[1];
      if (rDisp[2]) carryOrderNo = rDisp[2];

      const qty = parseFloat(rVal[5]) || 1;
      const price = parseFloat(rVal[6]) || 0;
      const totalVal = parseFloat(rVal[8]) || (qty * price);
      let saVal = String(rDisp[17] || '').trim();
      if (!saVal || saVal === '#REF!') {
        saVal = (payload.orderData && payload.orderData.saPic) ? payload.orderData.saPic : sheetName;
      }

      rowsToWriteToJobDone.push([
        targetNopol,
        rVal[1] || carryOrderDate || new Date(),
        rDisp[2] || (i === 0 ? carryOrderNo : ''),
        rDisp[3] || '-',
        rDisp[4] || '-',
        qty,
        price,
        rVal[7] || rDisp[7] || '',
        totalVal,
        rVal[9] || rDisp[9] || '',
        rDisp[10] || '',
        rDisp[11] || '',
        rVal[12] || rDisp[12] || '',
        rDisp[13] || '',
        rDisp[14] || '',
        rDisp[15] || '',
        rDisp[16] || 'ARRIVAL',
        saVal
      ]);
    }
  } else if (payload.orderData && Array.isArray(payload.orderData.items) && payload.orderData.items.length > 0) {
    // Fallback jika menggunakan data dari memori aplikasi
    const od = payload.orderData;
    const saVal = String(od.saPic || sheetName).trim().toUpperCase();
    for (let i = 0; i < od.items.length; i++) {
      const it = od.items[i];
      const qty = parseFloat(it.qty) || 1;
      const price = parseFloat(it.price) || 0;
      rowsToWriteToJobDone.push([
        targetNopol,
        parseFlexibleDate(od.orderDate) || od.orderDate || new Date(),
        i === 0 ? (od.orderNo || '') : '',
        it.partNo || '-',
        it.partName || '-',
        qty,
        price,
        parseFlexibleDate(it.eta || od.eta) || it.eta || od.eta || '',
        qty * price,
        parseFlexibleDate(it.ata || od.ata) || it.ata || od.ata || '',
        od.note || '',
        od.dp || '',
        parseFlexibleDate(it.newEta || it.etaBo) || it.newEta || it.etaBo || '',
        od.followUp1 || '',
        od.followUp2 || '',
        od.followUp3 || '',
        od.status || 'ARRIVAL',
        saVal
      ]);
    }
  } else {
    return { status: 'error', message: 'Data baris untuk Nopol ' + targetNopol + ' tidak ditemukan di Sheet ' + sheetName + '.' };
  }

  // 2. Tulis ke Sheet 'JOB DONE' dengan jarak 1 baris kosong dari baris terakhir
  const lastJobDoneRow = getTrueLastRowJobDone(jobDoneSheet);
  const startJobDoneRow = (lastJobDoneRow >= 5) ? (lastJobDoneRow + 2) : 5;
  const jobDoneInsertedRows = [];

  for (let i = 0; i < rowsToWriteToJobDone.length; i++) {
    const destRow = startJobDoneRow + i;
    const rowArr = rowsToWriteToJobDone[i];
    jobDoneSheet.getRange(destRow, 1, 1, 18).setValues([rowArr]);
    jobDoneSheet.getRange(destRow, 9).setFormula('=F' + destRow + '*G' + destRow);
    jobDoneSheet.getRange(destRow, 2).setNumberFormat('dd/MM/yyyy');
    if (rowArr[7]) jobDoneSheet.getRange(destRow, 8).setNumberFormat('dd/MM/yyyy');
    if (rowArr[9]) jobDoneSheet.getRange(destRow, 10).setNumberFormat('dd/MM/yyyy');
    if (rowArr[12]) jobDoneSheet.getRange(destRow, 13).setNumberFormat('dd/MM/yyyy');
    jobDoneInsertedRows.push(destRow);
  }

  // 3. Hapus baris Nopol tersebut dari Sheet Monitoring SA (tanpa merusak ArrayFormula di Baris 8)
  if (matchedRows.length > 0) {
    matchedRows.sort(function(a, b) { return a - b; });
    const minRow = matchedRows[0];
    const maxRow = matchedRows[matchedRows.length - 1];
    const rowsToDelete = matchedRows.slice();

    // Cek apakah baris tepat di bawahnya (maxRow + 1) adalah baris pemisah kosong
    if (maxRow + 1 <= srcSheet.getMaxRows()) {
      const nextDisp = srcSheet.getRange(maxRow + 1, 1, 1, 5).getDisplayValues()[0];
      const nextEmpty = !String(nextDisp[0] || '').trim() && !String(nextDisp[3] || '').trim() && !String(nextDisp[4] || '').trim();
      if (nextEmpty && (maxRow + 1) <= lastSrcRow) {
        rowsToDelete.push(maxRow + 1);
      } else if (maxRow === lastSrcRow && minRow > 9) {
        // Jika yang dihapus adalah grup paling bawah, hapus juga 1 baris kosong di atasnya agar tidak menumpuk spasi
        const prevDisp = srcSheet.getRange(minRow - 1, 1, 1, 5).getDisplayValues()[0];
        const prevEmpty = !String(prevDisp[0] || '').trim() && !String(prevDisp[3] || '').trim() && !String(prevDisp[4] || '').trim();
        if (prevEmpty && (minRow - 1) >= 9) {
          rowsToDelete.unshift(minRow - 1);
        }
      }
    }

    // Tambahkan baris kosong di bagian paling bawah terlebih dahulu agar jumlah baris Sheet tidak berkurang
    srcSheet.insertRowsAfter(srcSheet.getMaxRows(), rowsToDelete.length);

    // Hapus dari nomor baris terbesar ke terkecil (semua >= 9 sehingga Baris 8 ArrayFormula aman)
    rowsToDelete.sort(function(a, b) { return b - a; });
    for (let d = 0; d < rowsToDelete.length; d++) {
      const rDel = rowsToDelete[d];
      if (rDel >= 9) {
        srcSheet.deleteRow(rDel);
      }
    }
  }

  return {
    status: 'ok',
    message: 'Order ' + targetNopol + ' (' + rowsToWriteToJobDone.length + ' item part) berhasil dipindahkan ke Sheet JOB DONE (Baris ' + jobDoneInsertedRows.join(', ') + ') dan dihapus dari Monitoring ' + sheetName + '.',
    sheetName: sheetName,
    nopol: targetNopol,
    jobDoneRows: jobDoneInsertedRows
  };
}

/**
 * Menghapus order berstatus NOT FIX yang batal dari Sheet Monitoring SA
 */
function deleteCancelledOrderFromMonitoring(payload) {
  const sheetName = String(payload.sheetName || '').trim().toUpperCase();
  const targetNopol = String(payload.nopol || '').trim().toUpperCase();
  if (VALID_SA_SHEETS.indexOf(sheetName) === -1 || !targetNopol) {
    return { status: 'error', message: 'Sheet atau Nomor Polisi tidak valid.' };
  }

  const ssMon = SpreadsheetApp.openById(SPREADSHEET_MONITORING_ID);
  const srcSheet = ssMon.getSheetByName(sheetName);
  if (!srcSheet) {
    return { status: 'error', message: 'Sheet ' + sheetName + ' tidak ditemukan.' };
  }

  const lastSrcRow = getTrueLastDataRow(srcSheet, false);
  if (lastSrcRow < 9) {
    return { status: 'ok', message: 'Tidak ada baris untuk dihapus.' };
  }

  const numRows = lastSrcRow - 8;
  const disp = srcSheet.getRange(9, 1, numRows, 5).getDisplayValues();
  const matchedRows = [];
  let currentGroupNopol = '';

  for (let i = 0; i < disp.length; i++) {
    const rNum = i + 9;
    const rNopol = String(disp[i][0] || '').trim().toUpperCase();
    const rPartNo = String(disp[i][3] || '').trim();
    const rPartName = String(disp[i][4] || '').trim();

    if (!rNopol && !rPartNo && !rPartName) {
      currentGroupNopol = '';
      continue;
    }
    if (rNopol) currentGroupNopol = rNopol;
    if (currentGroupNopol === targetNopol) {
      matchedRows.push(rNum);
    }
  }

  if (matchedRows.length > 0) {
    matchedRows.sort(function(a, b) { return a - b; });
    const minRow = matchedRows[0];
    const maxRow = matchedRows[matchedRows.length - 1];
    const rowsToDelete = matchedRows.slice();

    if (maxRow + 1 <= srcSheet.getMaxRows()) {
      const nextDisp = srcSheet.getRange(maxRow + 1, 1, 1, 5).getDisplayValues()[0];
      const nextEmpty = !String(nextDisp[0] || '').trim() && !String(nextDisp[3] || '').trim() && !String(nextDisp[4] || '').trim();
      if (nextEmpty && (maxRow + 1) <= lastSrcRow) {
        rowsToDelete.push(maxRow + 1);
      } else if (maxRow === lastSrcRow && minRow > 9) {
        const prevDisp = srcSheet.getRange(minRow - 1, 1, 1, 5).getDisplayValues()[0];
        const prevEmpty = !String(prevDisp[0] || '').trim() && !String(prevDisp[3] || '').trim() && !String(prevDisp[4] || '').trim();
        if (prevEmpty && (minRow - 1) >= 9) {
          rowsToDelete.unshift(minRow - 1);
        }
      }
    }

    srcSheet.insertRowsAfter(srcSheet.getMaxRows(), rowsToDelete.length);
    rowsToDelete.sort(function(a, b) { return b - a; });
    for (let d = 0; d < rowsToDelete.length; d++) {
      if (rowsToDelete[d] >= 9) {
        srcSheet.deleteRow(rowsToDelete[d]);
      }
    }
  }

  return {
    status: 'ok',
    message: 'Order NOT FIX ' + targetNopol + ' berhasil dihapus dari Sheet ' + sheetName + '.'
  };
}

function parseFlexibleDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const p = s.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  // Format DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const p = s.split('/');
    return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
  }
  return null;
}

/**
 * Sinkronisasi data terakhir ke SOP LEMBAR1 & SOP LEMBAR2 di Spreadsheet 1
 */
function syncToFormSpreadsheet(order, picDisplay) {
  const ssForm = SpreadsheetApp.openById(SPREADSHEET_FORM_ID);
  const s1 = ssForm.getSheetByName('SOP LEMBAR1');
  const s2 = ssForm.getSheetByName('SOP LEMBAR2');
  if (!s1) return;

  s1.getRange('J7').setValue(String(order.nopol || '').trim().toUpperCase());
  s1.getRange('J11').setValue(picDisplay);
  if (order.eta) {
    s1.getRange('J12').setValue(new Date(order.eta));
  }
  if (order.note !== undefined) {
    s1.getRange('E26').setValue(String(order.note || '').trim());
  }

  for (let r = 17; r <= 23; r++) {
    s1.getRange('B' + r).clearContent();
    s1.getRange('H' + r).clearContent();
    s1.getRange('K' + r).clearContent();
    s1.getRange('L' + r).clearContent();
  }

  const maxSheetItems = Math.min(order.items.length, 7);
  for (let i = 0; i < maxSheetItems; i++) {
    const row = 17 + i;
    const it = order.items[i];
    s1.getRange('B' + row).setValue(String(it.partNo || '').trim().toUpperCase());
    s1.getRange('H' + row).setValue(String(it.partName || '').trim().toUpperCase());
    s1.getRange('K' + row).setValue(Number(it.qty) || 1);
    s1.getRange('L' + row).setValue(Number(it.price) || 0);
  }

  if (s2 && order.orderNo !== undefined) {
    s2.getRange('K7').setValue(String(order.orderNo || '').trim().toUpperCase());
  }
}

function formatPhone(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') {
    return String(Math.round(val));
  }
  return String(val).trim();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
