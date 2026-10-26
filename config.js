/**
 * Konfigurasi Utama Aplikasi Web Special Order Part (SOP) & Monitoring SA
 * PT. Agung Automall Gianyar
 */
window.SOP_CONFIG = {
  // ID Google Spreadsheet 1: Pembuatan Form Order (SOP LEMBAR1, SOP LEMBAR2, RAW)
  SPREADSHEET_FORM_ID: '12PjXEGd8Z52O40lB-_nA89vJH6wXSneBmBsSmDYlchk',

  // ID Google Spreadsheet 2: Monitoring Follow Up SA (AJS, AYU, FIK, WBN, OTHER)
  SPREADSHEET_MONITORING_ID: '1khVp8XaG1daE589qIEKp-NwcF17hXNkaHw4vX2Cp9wU',

  // URL Google Apps Script Web App (Hasil Deploy file WebAppAPI.gs)
  // Anda bisa menempelkan URL Web App di bawah ini sebelum push ke GitHub/Vercel,
  // atau mengisinya langsung melalui tombol "Pengaturan API" di dalam aplikasi web.
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwxnOjsIEu1sPFd7GY-igfuTZ7rw1X3zsoTQ-DDIRMJWRjZIHBn143TSFbS3uwrq-h8/exec',

  // Daftar Sheet SA yang aktif di Spreadsheet Monitoring
  SA_SHEETS: ['AJS', 'AYU', 'FIK', 'WBN', 'OTHER'],

  // Saran cepat nama PIC untuk kategori OTHER
  OTHER_PIC_SUGGESTIONS: ['PONI', 'MRA', 'PHW', 'THS', 'WSK', 'PTW']
};
