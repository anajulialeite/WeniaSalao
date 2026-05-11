const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`HTTP ${response.status()} - ${response.url()}`);
    }
  });

  console.log('Navigating to https://anajulialeite.github.io/WeniaSalao/ ...');
  await page.goto('https://anajulialeite.github.io/WeniaSalao/', { waitUntil: 'networkidle2' });

  console.log('Clicking btn-start...');
  try {
    await page.click('#btn-start');
    await new Promise(r => setTimeout(r, 1000));
    
    // Check if capture screen is active
    const captureClass = await page.$eval('#screen-capture', el => el.className);
    console.log('Capture screen class:', captureClass);
    
    // Get visible text of capture screen
    const captureVisible = await page.$eval('#screen-capture', el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.opacity !== '0';
    });
    console.log('Is capture screen visible?', captureVisible);
    
  } catch (err) {
    console.log('Error clicking:', err.message);
  }

  await browser.close();
})();
