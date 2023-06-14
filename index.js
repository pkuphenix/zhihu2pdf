const fs = require('fs');
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function convertToPDF(url, outputPath) {
  // determine category based on URL
  let category = 'answer'
  if (url.includes('zhuanlan')) {
    category = 'zhuanlan'
  }
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',                    // 沙盒模式
      '--disable-setuid-sandbox',        // uid沙盒
      '--disable-dev-shm-usage',         // 创建临时文件共享内存
      // '--disable-accelerated-2d-canvas', // canvas渲染
      // '--disable-gpu',                   // GPU硬件加速
      '--window-size=1920,1080',
      '--disable-accelerated-compositing',
      // '--single-process',
      // '--enable-automation',
    ]
  });
  const page = await browser.newPage();
  await page.goto(url)
  const buttons = await page.$$('button[class="Button Modal-closeButton Button--plain"]')
  if (buttons.length > 0) {
    await buttons[0].click()
  }

  // 页面滚动函数
  await page.evaluate(async (ele) => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      let distance = 100;
      let timer = setInterval(() => {
        let scrollHeight = ele
        if (typeof ele === "string") {
          let element = document.querySelector(ele)
          scrollHeight = element ? (element.offsetTop - window.screen.availHeight) : document.body.scrollHeight;
        }
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  }, 'div.Comments-container');

  await page.emulateMediaType('screen')
  // await page.waitForSelector('div[style^="transform-origin: center bottom"]')
  await page.evaluate(() => {
    const remove_dom_by_selector = (sel) => {
      dom = document.querySelector(sel)
      if (dom) {
        dom.remove()
      }
    }
    // 登陆提示
    remove_dom_by_selector('div[style^="transform-origin: center bottom"]')
    // 知乎页首
    remove_dom_by_selector('div.ColumnPageHeader')
    // 评论区
    remove_dom_by_selector('div.Comments-container')
    // 推荐阅读
    remove_dom_by_selector('div.Recommendations-Main')
  })

  if (category == 'answer') {
    await page.evaluate(() => {
      const remove_dom_by_selector = (sel) => {
        dom = document.querySelector(sel)
        if (dom) {
          dom.remove()
        }
      }
      remove_dom_by_selector('.QuestionHeader-side') // header边栏
      remove_dom_by_selector('.QuestionHeader-tags') // 头部tags
      remove_dom_by_selector('.QuestionHeader-footer') // header底部
      remove_dom_by_selector('.Question-mainColumnLogin') // 登录提示
      remove_dom_by_selector('.ViewAll') // 查看全部
      remove_dom_by_selector('.Question-main .Question-sideColumn') // 边栏
    })
  }

  // 针对比较顽固的dom，采用提前注入css的方式隐藏
  await page.addStyleTag({content: `
    .Sticky {
      display: none !important;
    }
    .CornerButtons {
      display: none !important;
    }
  `});

  if (category == 'answer') {
    await page.addStyleTag({content: `
      .Question-main .ListShortcut {
        margin: 0 auto;
      }
      .QuestionHeader-title {
        margin: 0 auto;
      }
      .QuestionHeader-main {
        margin: 0 auto;
      }
      .QuestionHeader-content {
        margin: 0 auto;
      }
      .QuestionHeader-side {
        display: none !important
      }
    `});
  }

  // only for debug
  // await page.screenshot({ path: 'zhuanlan.png', fullPage: true});

  await page.pdf({ 
    path: outputPath, 
    printBackground: true,
    "-webkit-print-color-adjust": "exact",
  });
  await page.waitForTimeout(3000)
  console.log('success')
  await browser.close();
}

// use the function
let url = process.argv[2];
let outputPath = process.argv[3];
convertToPDF(url, outputPath);