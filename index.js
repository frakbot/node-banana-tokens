#!/bin/env node

'use strict';

const webdriver = require('selenium-webdriver');

const loginUrl = 'http://www.ianker.com/user.php?act=login';
const tokenUrl = 'http://www.ianker.com/user.php';

const username = process.argv[2];
const password = process.argv[3];

const getRandomTime = function() {
  return (Math.random() * (3000 - 1000)) + 1000;
};

const buildDriver = function() {
  return new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();
};

const login = function() {
  // Open the login page
  return driver
    .get(loginUrl)
    .then(function() {
      // Input user data
      driver
        .findElement(webdriver.By.css('input[name="username"]'))
        .sendKeys(username);
      driver
        .findElement(webdriver.By.css('input[name="password"]'))
        .sendKeys(password);

      // Sleep for a while
      driver.sleep(getRandomTime());

      // Submit the form
      return driver
        .findElement(webdriver.By.css('form.sign_form'))
        .submit();
    })
    .then(function() {
      return driver
        .findElement(webdriver.By.css('p.message_content'))
        .getText()
    })
    .then(function(loginResult) {
      if (loginResult !== 'Login successful.') {
        throw new Error('Login unsuccessful.');
      }
      return true;
    });
};

const getTokenPage = function() {
  return driver.get(tokenUrl)
    .then(function() {
      return driver.wait(function() {
        return driver.executeScript('return jQuery.isReady');
      });
    });
};

const logCurrentTokens = function() {
  return driver
    .findElement(webdriver.By.css('#memberside_bucks'))
    .getText()
    .then(function(tokens) {
      console.log('You have %s tokens.', tokens);
      return tokens;
    });
};

const getTodaysTokens = function() {
  const elementCriteria = webdriver.By.css('.get_pb');
  return driver
    .isElementPresent(elementCriteria)
    .then(function(canGetTokens) {
      if (!canGetTokens) {
        throw new Error('Today\'s tokens were already mined.');
      }
      return canGetTokens;
    })
    .then(function() {
      const button = driver.findElement(webdriver.By.css('.get_pb'));
      return button.click();
    })
    .then(function() {
      return driver.sleep(getRandomTime() + '5000');
    })
    .then(function() {
      return driver.isElementPresent(webdriver.By.css('.get_pb_disable'));
    })
    .then(function(hasNewTokens) {
      if (!hasNewTokens) {
        throw new Error('Token request failed.');
      }
    });
};

const overAndOut = function() {
  console.log('Over and out, browser.');
  driver.sleep(getRandomTime())
    .then(function() {
      console.log('Over and out, commander.');
      driver.quit();
    });
};

const driver = buildDriver();
console.log('Aye aye, commander.');

login()
  .then(getTokenPage)
  .then(logCurrentTokens)
  .then(getTodaysTokens)
  .then(logCurrentTokens)
  .thenCatch(function(error) {
    console.error(error.message);
  })
  .thenFinally(overAndOut);

