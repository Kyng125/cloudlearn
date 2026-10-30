const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3100';
const roles = { student: 'student@cloudlearn.com', instructor: 'instructor@cloudlearn.com', admin: 'admin@cloudlearn.com' };
(async () => {
  const b = await chromium.launch(); const problems = []; let pages = 0;
  for (const vp of [{ n: 'desktop', w: 1280, h: 800 }, { n: 'mobile', w: 390, h: 800 }]) {
    for (const [role, email] of Object.entries(roles)) {
      const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h } }); const p = await ctx.newPage(); p.setDefaultTimeout(8000); await ctx.route(u=>!u.href.startsWith(BASE), r=>r.abort());
      const tag = `${vp.n}/${role}`;
      p.on('pageerror', e => problems.push(`${tag} pageerror ${e.message}`));
      p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_TUNNEL|Failed to load resource.*(40[13])/.test(m.text())) problems.push(`${tag} console ${m.text().slice(0, 120)}`); });
      p.on('response', r => { if (r.url().includes('/api/') && r.status() >= 400 && r.status() !== 401) problems.push(`${tag} ${r.status()} ${r.request().method()} ${r.url().replace(BASE, '')}`); });
      await p.goto(BASE,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(800);
      await p.getByRole('button', { name: 'Sign in', exact: true }).first().click();
      await p.locator('input[type=email]').fill(email); await p.locator('input[type=password]').fill('demo123');
      await p.locator('input[type=password]').press('Enter');
      await p.waitForTimeout(1500);
      
      console.log(tag,'logged in');const labels = await p.locator('nav button, aside button').allInnerTexts();
      const uniq = [...new Set(labels.map(s => s.trim().split('\n')[0]).filter(Boolean))];
      for (const l of uniq) {
        if (/log ?out|sign ?out/i.test(l)) continue;
        if (vp.n === 'mobile') { const bb = await p.locator('aside').first().boundingBox(); if (!bb || bb.x < -1) await p.locator('button[aria-label="Open menu"]').click(); await p.waitForTimeout(350); }
        const el = p.locator('nav button, aside button').filter({ hasText: l }).first();
        if (!(await el.isVisible().catch(() => false))) continue;
        console.log(tag,l);await el.click({timeout:3000}).catch(e => problems.push(`${tag} could not click "${l}"`)); await p.waitForTimeout(500); pages++;
        const txt = await p.locator('body').innerText();
        if (/Something went wrong|undefined|NaN|\[object/.test(txt)) problems.push(`${tag} "${l}" shows bad text`);
        const ov = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
        if (ov) problems.push(`${tag} "${l}" horizontal overflow`);
      }
      console.log(tag, 'url-ok', 'visited', uniq.length, 'nav items');
      await ctx.close();
    }
  }
  console.log('pages', pages, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
  await b.close(); process.exit(problems.length ? 1 : 0);
})();
