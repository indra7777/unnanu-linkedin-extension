console.log("-= The Unnanu extension is live! =-");
var endpointType = 'uat'
var APIstring = 'https://plugin.unnanu.com'; //https://plugin.unnanu.com

let allData = {
  jobData: null,
  applicants: []
};

let stopScraping = false;
let currentApplicantIndex = 0;
var isFirstTime = true;
let jobData = null; 
let stopInitiated = false;
var isHire;
var currentUrl;
let isScrapeCurrentRunning = false;
var accType;
var accID;
var isScrapingInProgress;


chrome.storage.local.get('pendingScrape', function(data) {
  if (data.pendingScrape) {

    chrome.storage.local.remove('pendingScrape', function() {
      onReloadedScrape();
    });
  }
});

chrome.storage.local.get('pendingApps', function(data) {
  if (data.pendingApps) {

    chrome.storage.local.remove('pendingApps', function() {
      onReloadedApps();
    });
  }
});

chrome.storage.local.get('pendingP', function(data) {
  if (data.pendingP) {

    chrome.storage.local.remove('pendingP', function() {
      onReloadedP();
    });
  }
});

chrome.storage.local.get('pendingS', function(data) {
  if (data.pendingS) {

    chrome.storage.local.remove('pendingS', function() {
      onReloadedS();
    });
  }
});


function onReloadedScrape() {
  injectStyles();
  ScrapeCurrent();
}

function onReloadedApps() {
  injectStyles();
  ScrapeApps();
  chrome.runtime.sendMessage({ action: "scrapingStarted" });
  chrome.storage.local.set({'profilesCollected': 0});
  chrome.runtime.sendMessage({ action: "updateTheCount" });
}

function onReloadedP() {
  injectStyles();
  ScrapeProjects();
  chrome.runtime.sendMessage({ action: "scrapingStartedP" });
  chrome.storage.local.set({'profilesCollectedP': 0});
  chrome.runtime.sendMessage({ action: "updateTheCountP" });
}

function onReloadedS() {
  injectStyles();
  ScrapeSales();
  chrome.runtime.sendMessage({ action: "scrapingStartedS" });
  chrome.storage.local.set({'profilesCollectedS': 0});
  chrome.runtime.sendMessage({ action: "updateTheCountS" });
}



//---------------------------------------

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {

    console.log(request.message)


    if (request.message === "scrapeCurrent") {
      refreshAll_Curr();
    }

    if (request.message === "scrapeApps") {
      refreshAll_Apps();
    }

    if (request.message === "scrapeProjects") {
      refreshAll_P();
    }

    if (request.message === "scrapeSales") {
      refreshAll_S();
    }


    if(request.message === "refreshAll"){
      refreshAll();
    }

    if (request.action === "finalScrapedData") {
      console.log("+ Received final extracted data from ", request.data.fullName);
    }

    if (request.message === "stopScraping") {
      StopScraping();
      chrome.runtime.sendMessage({ action: "scrapingStopped" });

      if(isScrapingInProgress == false){
        chrome.storage.local.get('stopInitiated', function(data) {
          const wasStopInitiated = data.stopInitiated || false;
    
          if(wasStopInitiated) {
              chrome.runtime.sendMessage({ action: "scrapingFullyStopped" });
              chrome.storage.local.set({ 'stopInitiated': false }); // reset for the next possible scraping session
          }
      });
      }


    }

    if (request.message === "stopScrapingP") {
      StopScrapingP();
      chrome.runtime.sendMessage({ action: "scrapingStoppedP" });

      if(isScrapingInProgress == false){
        chrome.storage.local.get('stopInitiatedP', function(data) {
          const wasStopInitiated = data.stopInitiatedP || false;
    
          if(wasStopInitiated) {
              chrome.runtime.sendMessage({ action: "scrapingFullyStoppedP" });
              chrome.storage.local.set({ 'stopInitiatedP': false }); // reset for the next possible scraping session
          }
      });
      }
    }

    if (request.message === "stopScrapingS") {
      StopScrapingS();
      chrome.runtime.sendMessage({ action: "scrapingStoppedS" });

      if(isScrapingInProgress == false){
        chrome.storage.local.get('stopInitiatedS', function(data) {
          const wasStopInitiated = data.stopInitiatedS || false;
      
          if(wasStopInitiated) {
              chrome.runtime.sendMessage({ action: "scrapingFullyStoppedS" });
              chrome.storage.local.set({ 'stopInitiatedS': false }); // reset for the next possible scraping session
          }
        });
      }
    }

    if (request.message === "resumeScraping") {
      NextStep();
    }

    if (request.message === "checkForElement") {
      const elementExists = document.querySelector("button[aria-label='Edit profile background'][id^='ember']") !== null;
      sendResponse({elementFound: elementExists});
    }

    if (request.message === "showOverlay") {
      showOverlay();
    }

    if (request.message === "hideOverlay") {
      hideOverlay();
    }



  }
);

function waitForElement(selector, callback) {
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (document.querySelector(selector)) {
        callback();
        observer.disconnect();
      }
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}


chrome.storage.local.get('shouldScrapeCurrent', (data) => {
  if (data.shouldScrapeCurrent) {
      ScrapeCurrent(true).then(() => {
          // Reset the flag after scraping
          chrome.storage.local.set({ 'shouldScrapeCurrent': false });
      });
  }
});


chrome.storage.local.get('resumeScrapingData', function(data) {
  if (data.resumeScrapingData) {
      console.log("Resuming scraping after page reload...");

      // Check the stored URL
      const storedURL = data.resumeScrapingData.url;
      if (storedURL && window.location.href !== storedURL) {
          window.location.href = storedURL;
          return; // Do not proceed further. Let the page load the correct URL first.
      }

      // Restore the state
      allData = data.resumeScrapingData.allData;
      currentApplicantIndex = data.resumeScrapingData.currentApplicantIndex;

      // Clear the saved state from storage
      chrome.storage.local.remove('resumeScrapingData');

      injectStyles();
      ScrapeApps();

      chrome.runtime.sendMessage({ action: "scrapingStarted" });
      chrome.storage.local.set({'profilesCollected': 0});
      chrome.runtime.sendMessage({ action: "updateTheCount" });
  }
});


function refreshAll(){
  location.reload();
  chrome.runtime.reload();
}

function refreshAll_Curr() {
  chrome.storage.local.set({ pendingScrape: true }, function() {
    location.reload();
    chrome.runtime.reload();
  });
}

function refreshAll_Apps() {
  chrome.storage.local.set({ pendingApps: true }, function() {
    location.reload();
    chrome.runtime.reload();
  });
}

function refreshAll_P() {
  chrome.storage.local.set({ pendingP: true }, function() {
    location.reload();
    chrome.runtime.reload();
  });
}

function refreshAll_S() {
  chrome.storage.local.set({ pendingS: true }, function() {
    location.reload();
    chrome.runtime.reload();
  });
}

//-----------------------------------

function NextStep(){
  const holder = document.querySelector('.artdeco-list');
  const applicants = holder ? holder.querySelectorAll('.hiring-applicants__list-item') : null;
  if (applicants && currentApplicantIndex < applicants.length) {
      // Process the next applicant in the current list.
      processNextApplicant(applicants);
  } else {
      // No more applicants left on the current page. Check for the next page.
      checkAndGoToNextPageOrEnd();
  }
}


function refreshTokenIfActivity() {
  if (isScrapingInProgress) {
    const currentTime = new Date().getTime();
    const expiryTime = currentTime + 60 * 60 * 1000;  // 30 minutes in milliseconds

    chrome.storage.local.set({ 'unnanu_expiry': expiryTime }, function() {
      console.log('unnanu_expiry set:', new Date(expiryTime));
    });
  } else {
    console.log('Scraping is not in progress.');
  }
}
setInterval(refreshTokenIfActivity, 30 * 60 * 1000);


async function checkAndGoToNextPageOrEnd() {
  // Check for the next page
  const isNextPageAvailable = goToNextPage();
  if (isNextPageAvailable) {
      // Wait for the new page to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      // Reset currentApplicantIndex and get the new set of applicants
      currentApplicantIndex = 0;
      const holder = document.querySelector('.artdeco-list');
      const newApplicants = holder ? holder.querySelectorAll('.hiring-applicants__list-item') : null;
      if (newApplicants) {
          processNextApplicant(newApplicants);
      } else {
          // If there's an issue loading the next set of applicants, end the scraping.
          NaturalEnd();
      }
  } else {
      // If there's no next page, end the scraping.
      NaturalEnd();
  }
}

function sendScrapedDataToAPI() {
  // Fetch data directly from chrome.storage.local
  chrome.storage.local.get(['unnanu_token', 'unnanu_id', 'unnanu_expiry', 'unnanu_type'], function(result) {

    if (result.unnanu_token && result.unnanu_id) {
      const unnanuData = {
        token: result.unnanu_token,
        id: result.unnanu_id,
        type: result.unnanu_type
      };

      const hireOrTalent = unnanuData.type === "hire" ? 1 : 0;

      // Convert allData to string and append to the apiUrl
      const wrappedData = JSON.stringify({
        jsondata: JSON.stringify(allData)
      });

      if(allData.applicants.length == 0){
        console.error("Failed to send extracted data to API.", "No Applicants");
        showErrorPopup("Failed to send extracted data. No Applicants");
        return;
      }else if(allData.jobData == null){
        console.error("Failed to send extracted data to API.", "No Job Data");
        showErrorPopup("Failed to send extracted data. No Job Data");
        return;
      }

      //const apiUrl = `https://`+endpointType+`-hire-oth-v5.unnanu.com/api/v1/user/data/${hireOrTalent}/${unnanuData.id}`;
      const apiUrl = `${APIstring}/api/v1/user/data/${hireOrTalent}/${unnanuData.id}?endpointType=${endpointType}`;


      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${unnanuData.token}`,
          'Content-Type': 'application/json'
        },
        body: wrappedData
      })
      .then(response => response.json())
      .then(data => {
        console.log("Data sent successfully!", data);
        showSuccessPopup();
      })
      .catch(error => {
        console.error("Failed to send extracted data to API.", error);
        showErrorPopup("Failed to send extracted data.");
      });

    } else {
      console.error("Unnanu data (type, ID, or token) missing.");
    }
  });
}

function sendScrapedDataToAPI_SingleProfile(data) {
  // Fetch data directly from chrome.storage.local
  var dataHolder = data;
  chrome.storage.local.get(['unnanu_token', 'unnanu_id', 'unnanu_expiry', 'unnanu_type'], function(result) {

      if (result.unnanu_token && result.unnanu_id) {
          const unnanuData = {
              token: result.unnanu_token,
              id: result.unnanu_id,
              type: result.unnanu_type
          };

          const hireOrTalent = unnanuData.type === "hire" ? 1 : 0;

          // Convert data to string and append to the apiUrl
          const wrappedData = JSON.stringify({
            jsondata: JSON.stringify(data)
          });

          //const apiUrl = `https://`+endpointType+`-hire-oth-v5.unnanu.com/api/v1/user/data/${hireOrTalent}/${unnanuData.id}`;
          const apiUrl = `${APIstring}/api/v1/user/data/${hireOrTalent}/${unnanuData.id}?endpointType=${endpointType}`;

          fetch(apiUrl, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${unnanuData.token}`,
                  'Content-Type': 'application/json'
              },
              body: wrappedData
          })
          .then(response => response.json())
          .then(data => {
              console.log("Data sent successfully!", data);
              storeSentProfileId(dataHolder.url);
              showSuccessPopup();
          })
          .catch(error => {
              console.error("Failed to send extracted data to API.", error);
              showErrorPopup("Failed to send extracted data.");
          });

      } else {
          console.error("Unnanu data (type, ID, or token) missing.");
      }
  });
}


function storeSentProfileId(profileId) {
  chrome.storage.local.get(['sentProfileIds'], function(result) {
      let sentProfileIds = result.sentProfileIds || [];
      if (!sentProfileIds.includes(profileId)) {
          sentProfileIds.push(profileId);
          chrome.storage.local.set({ 'sentProfileIds': sentProfileIds });
      }
  });
}


//------------------
async function ScrapeJobData() {
  const holderElem = document.querySelector('.hiring-job-top-card__job-info').children[0].children[1];

  if (!holderElem) {
      console.error("Holder element not found");
      return null;
  }

  const jobTitleElem = holderElem.children[0].children[0];
  const jobTitle = jobTitleElem ? removePrefix(cleanText(jobTitleElem.textContent), "Job title") : null;

  const companyElem = holderElem.children[1].children[0];
  const company = companyElem ? removePrefix(cleanText(companyElem.textContent), "Company name") : null;

  const locationElem = holderElem.children[1].children[1];
  const location = locationElem ? removePrefix(cleanText(locationElem.textContent), "Job location") : null;

  const jobStateElem = holderElem.children[2].children[0];
  const jobState = jobStateElem ? jobStateElem.textContent.trim() : null;

  // Extracting jobID from the current URL
  const urlParts = window.location.href.split('/');
  const jobIndex = urlParts.indexOf('jobs');
  const jobID = jobIndex !== -1 ? urlParts[jobIndex + 1] : null;

  document.querySelector('button[aria-label*="Manage job"]').click();

  var elem1,elem2;
  do {
    elem1 = document.querySelector('.hiring-job-information__job-description');
    await new Promise(resolve => setTimeout(resolve, 1000));
  } while (!elem1);

  var jobDescription = document.querySelector('.hiring-job-information__job-description').innerHTML.trim();

  window.history.back();

  do {
    elem2 = document.querySelector('.hiring-applicants__list-container');
    await new Promise(resolve => setTimeout(resolve, 1000));
  } while (!elem2);


  return {
      jobTitle: jobTitle,
      company: company,
      location: location,
      jobState: jobState,
      description: jobDescription,
      jobID: jobID
  };
}


async function ScrapeJobDataS() {
  var currentUrl = window.location.href;
  var jobTitle = null, description = null, urlParams = null, savedSearchId = null;

  if(isOnLists()){
    jobTitle = document.getElementsByClassName('lists-nav__list-name mr1 inline t-sans t-16 t-black t-bold')[0].innerText;
    description = currentUrl;

    var match = currentUrl.match(/\/(\d+)\?/);

    if (match && match[1]) 
       savedSearchId = match[1];

      if(savedSearchId == null || savedSearchId == undefined){
        urlParams = new URLSearchParams(currentUrl);
        savedSearchId = urlParams.get('savedSearchId');
      }


  }else{
    jobTitle = document.querySelector('[class^="t-bold nowrap-ellipsis inline _saved-search-title_"]')?.innerText || null;
    description = currentUrl;

    var pattern = /savedSearchId=(\d+)/;
    var match = pattern.exec(currentUrl);

    if (match) {
        savedSearchId = match[1];
    }
 
    console.log(savedSearchId)

    
   }


  return {
    jobTitle: jobTitle,
    company: null,
    description: description,
    location: null,
    jobID: savedSearchId
  };

}

async function ScrapeJobDataP() {
  const holderElem = document.getElementsByClassName('project-lockup t-14')[0];

  if (!holderElem) {
      console.error("Holder element not found");
      return null;
  }

  const jobTitleElem = holderElem.children[0];
  const jobTitle = jobTitleElem ? jobTitleElem.innerText.split('\n')[0] : null;

  const companyElem = holderElem.children[1].children[1].children[0];
  const company = companyElem ? companyElem.innerText.split('\n')[0] : null;

  // Extracting jobID from the current URL
  const urlParts = window.location.href.split('/');
  const jobIndex = urlParts.indexOf('hire');
  const jobID = jobIndex !== -1 ? urlParts[jobIndex + 1] : null;

  //Click to get more data
  document.getElementsByClassName('fluid-content-wrapper navigation-tabs__wrapper')[0].children[3].click();

  //message whene there is NO job post
  const emptyStateMessageElement = await waitForElementNoJobPost('artdeco-empty-state__message');
  if (emptyStateMessageElement) {
    //NO JOB POST

    document.getElementsByClassName('fluid-content-wrapper navigation-tabs__wrapper')[0].children[2].click();

    return {
      jobTitle: jobTitle,
      company: company,
      description: 'job not posted',
      location: 'job not posted',
      jobID: jobID
    };
  } else {
    //JOB POST

    const descElement = await waitForElement('.job-preview__description');
    const desc = descElement ? descElement.innerHTML.trim() : 'Description not found';

    const locationElement = document.querySelector('.job-preview__location');
    const location = locationElement ? locationElement.innerText.trim() : 'Location not found';

    /*
    if(isLinkedInTalentPage(window.location.href))
    document.getElementsByClassName('fluid-content-wrapper navigation-tabs__wrapper')[0].children[1].click();
    else
    document.getElementsByClassName('fluid-content-wrapper navigation-tabs__wrapper')[0].children[0].click();
    */

    document.getElementsByClassName('fluid-content-wrapper navigation-tabs__wrapper')[0].children[1].click();

    return {
      jobTitle: jobTitle,
      company: company,
      description: desc,
      location: location,
      jobID: jobID
    };

  }


}

async function waitForElementNoJobPost(selector) {
  return new Promise(async (resolve) => {
    const checkInterval = 1000; // 1 second
    const maxAttempts = 7;
    let attempts = 0;

    const checkElement = async () => {
      const targetElements = document.getElementsByClassName(selector);

      if (targetElements.length > 0) {
        console.log('aaaaa');
        resolve(targetElements[0]);
      } else {
        attempts++;

        if (attempts < maxAttempts) {
          setTimeout(checkElement, checkInterval);
        } else {
          console.error(`Timeout: Element with selector '${selector}' not found after ${maxAttempts} attempts`);
          resolve(null); // Resolve with null if element not found after maxAttempts
        }
      }
    };

    checkElement();
  });
}


function waitForElement(selector) {
  return new Promise(resolve => {
    const checkInterval = 1000; // milliseconds
    const maxAttempts = 5; // adjust as needed
    let attempts = 0;

    const checkElement = () => {
      const targetElement = document.querySelector(selector);

      if (targetElement) {
        resolve(targetElement);
      } else {
        attempts++;

        if (attempts < maxAttempts) {
          setTimeout(checkElement, checkInterval);
        } else {
          console.error(`Timeout: Element with selector '${selector}' not found`);
          resolve(null); // Resolve with null if element not found after maxAttempts
        }
      }
    };

    checkElement();
  });
}


async function ScrapeCurrent(shouldCloseTab) {

  if (isScrapeCurrentRunning) {
    console.warn("ScrapeCurrent is already running. Aborting new attempt.");
    return;
  }

  var accID;
  var accType;
  var profileLink = window.location.href;
  try {
    const storageData = await getFromChromeStorage(['unnanu_token', 'unnanu_id', 'unnanu_expiry', 'unnanu_type']);
    if (storageData.unnanu_token && storageData.unnanu_id) {
        const unnanuDataTemp = {
            token: storageData.unnanu_token,
            id: storageData.unnanu_id,
            type: storageData.unnanu_type
        };
  
        accID = unnanuDataTemp.id;
        accType = unnanuDataTemp.type === "hire" ? 1 : 0;
    }
  } catch(error) {
      console.error("Error fetching data from storage:", error);
  }

  const importResult = await importProfileData(accType, accID, profileLink);
  if (importResult === 'alreadyImported') {
      console.log("Profile was previously imported. Skipping...");
      showAlreadySentPopup();
      return null;
  } 
  
  console.log("ScrapeCurrent() started!");
  isScrapeCurrentRunning = true;
  showOverlay();

  await WaitForElemToLoad('#about');

  currentUrl = window.location.href;
  
  let result = {
      fullName: fetchTextContent('h1'),  //2/1/25/IG
      connectionDegree: fetchTextContent('span.dist-value'),
      shortDescription: fetchTextContent('div.text-body-medium.break-words'),
      location: fetchTextContent('span.text-body-small.inline.t-black--light.break-words'),
      resumeID: null,
      url: document.URL
  };

  try {
    const modalData = await fetchModalData();

    console.log("GOT MODAL DATA")
    console.log(modalData)

    result = { ...result, ...modalData };
  } catch (error) {
    console.error("Error fetching modal data:", error);
  }

  // Extract longDescription
  const aboutElement = document.querySelector('div#about.pv-profile-card__anchor');
  if (aboutElement && aboutElement.nextElementSibling && aboutElement.nextElementSibling.nextElementSibling) {
    const longDescriptionElement = aboutElement.nextElementSibling.nextElementSibling.querySelector('div.pv-shared-text-with-see-more span[aria-hidden="true"]');
    if (longDescriptionElement) {
      result.longDescription = longDescriptionElement.textContent.trim();
    }
  }




  const domainFromCompany = await extractDomain();
  result.domain = domainFromCompany;


  if(document.querySelector('#experience') != null){
  const experiencesList = await extractExperiences();
  result.experiences = experiencesList;
  }else{
    result.experiences = null;
  }


  if(document.querySelector('#education') != null){
  const educationList = await extractEducation();
  result.educations = educationList;
  }else{
    result.educations = null;
  }


  if(document.querySelector('#skills') != null){
  const skillsList = await extractSkills();
  result.skills = skillsList;  
  }else{
    result.skills = null;
  }


  if(document.querySelector('#licenses_and_certifications') != null){
    const licensesAndCertificationsList = await extractLicensesAndCertifications();
    result.licensesAndCertifications = licensesAndCertificationsList;
  }else{
    result.licensesAndCertifications = null;
  }




  console.log(result);

  if(shouldCloseTab) {
    chrome.runtime.sendMessage({ action: "scrapedData", data: result }, () => {
        chrome.runtime.sendMessage({ action: "scrapingComplete" });
    });
} else {

  const requiredParams = [
      'fullName', 'shortDescription', 'longDescription', 'connectionDegree',
      'location', 'url', 'email', 'phone', 'birthday', 'resumeID', 'domain',
      'status', 'skills', 'experiences', 'educations', 'licensesAndCertifications'
  ];

result = ensureRequiredParams(result, requiredParams);

    sendScrapedDataToAPI_SingleProfile(result);
    hideOverlay();
    showLoadingPopup();
    chrome.runtime.sendMessage({ action: "restoreScrapeProfileButtonState" });
}

isScrapeCurrentRunning = false;
}

async function ScrapeApps() {
  console.log("Scrape Applicants started!");
  isScrapingInProgress = true;

  const wasReloadedDueToVirusScan = await new Promise(resolve => {
    chrome.storage.local.get('reloadedDueToVirusScan', function(data) {
        resolve(data.reloadedDueToVirusScan);
    });
});

  if(wasReloadedDueToVirusScan){
    //nothing
  }else{
    await showLimitPopup();
  }

  showOverlay();
  stopScraping = false;
  chrome.storage.local.set({ 'isRunning': true }, function() {
    if (chrome.runtime.lastError) {
        console.log("Error setting isRunning:", chrome.runtime.lastError);
    }
});

  allData.jobData = await ScrapeJobData();

  const holder = document.querySelector('.artdeco-list');
  if (!holder) {
      console.error("Holder not found");
      return;
  }

  const applicants = holder.querySelectorAll('.hiring-applicants__list-item');
  if (!applicants || applicants.length === 0) {
      console.error("No applicants found");
      return;
  }

  // Start processing the first applicant
  processNextApplicant(applicants);
}

function isLinkedInTalentPage(url) {
  // Use a regular expression to match the pattern
  const regex = /^https:\/\/www\.linkedin\.com\/talent\/hire\/\d+\/manage\/all$/;
  return regex.test(url);
}

function ensureRequiredParams(result, requiredParams) {
  requiredParams.forEach(param => {
      if (!result.hasOwnProperty(param)) {
          result[param] = null;
      }
  });
  return result;
}


//Scrape Sales Nav ---------------------------------
//Scrape Sales Nav ---------------------------------

function isOnLists(){
  var currentUrl = window.location.href;
  if (currentUrl.includes('https://www.linkedin.com/sales/lists/')) {
    return true;
  } else {
    return false;
  }
}


async function ScrapeSales() {
  console.log("Scrape Sales started!");
  isScrapingInProgress = true;

  const wasReloadedDueToVirusScan = await new Promise(resolve => {
    chrome.storage.local.get('reloadedDueToVirusScan', function(data) {
        resolve(data.reloadedDueToVirusScan);
    });
});

  if(wasReloadedDueToVirusScan){
    //nothing
  }else{
    await showLimitPopup();
  }
  
  showOverlay();
  stopScraping = false;
  chrome.storage.local.set({ 'isRunningS': true });

  allData.jobData = await ScrapeJobDataS();

  console.log("Job Data")
  console.log(allData.jobData)

  if(isOnLists()){
    while (true) {
      const element = document.getElementsByClassName('artdeco-models-table-row ember-view')[0].parentElement;
      if (element) {
        console.log('Element found - profile list 2!');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }else{
  while (true) {
    const element = document.getElementsByClassName('artdeco-list background-color-white')[0];
    if (element) {
      console.log('Element found - profile list 2!');
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}


  var holder;
  
  if(isOnLists())
    holder = document.getElementsByClassName('artdeco-models-table-row ember-view')[0].parentElement;
  else
    holder = document.getElementsByClassName('artdeco-list background-color-white')[0];

  if (!holder) {
      console.error("Holder not found");
      return;
  }

  numberOfApplicants = holder.children.length;

  console.log("There are " + numberOfApplicants + " of applicants"); 

  const applicants = holder.children;
  if (!applicants || numberOfApplicants === 0) {
      console.error("No applicants found");
      return;
  }

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  await delay(Math.random() * 500 + 1500);


  //CLICK THE FIRST TO OPEN THE WINDOW
  if(isOnLists())
  document.getElementsByClassName('artdeco-models-table-row ember-view')[0].querySelector('[aria-label="Lead Name"]').children[0].click()
  else
  document.getElementsByClassName('artdeco-list__item pl3 pv3')[0].querySelector('[data-control-name="view_lead_panel_via_search_lead_name"]').click();

  // Start processing the first applicant
  processNextApplicantS();
}


async function processNextApplicantS() {
  if (stopScraping) {
    NaturalEnd();
    return;  
  }

updateProfilesCount();
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

console.log("Process next applicant");
console.log("Current index is " + currentApplicantIndex + " < " + numberOfApplicants);


//Waitig for data to load
try {
  await wiatForLoadingToFinish();
  console.log('Element username found!');
} catch (error) {
  console.error('Error waiting for element for username', error);
}


await delay(Math.random() * 500 + 2000);


if (currentApplicantIndex < numberOfApplicants) {
    var applicantData = await processApplicantS();

    console.log("+ Scraped project data")
    
    if (applicantData || applicantData.status == "already exists") {
        console.log("++ Push project data")
        allData.applicants.push(applicantData);
    }    
    
    currentApplicantIndex++;
    console.log(applicantData)

    //waitBeforeContinuing
    await delay(Math.random() * 500 + 1000);
    document.querySelector('._inline-sidesheet-header_1cn7lg').children[0].children[1].click()
    processNextApplicantS();

  } else {

    console.log("ENTERED THE NEXT PAGE LOGIC") 
      // Check for the next page
      const isNextPageAvailable = goToNextPageS();
      if (isNextPageAvailable) {
          // Here, we wait for the new page to load and then resume scraping.
          // Depending on the LinkedIn loading time, you might need to adjust this wait time.
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Reset currentApplicantIndex and get the new set of applicants
          currentApplicantIndex = 0;
          var holder;
          
          if(isOnLists())
          holder = document.getElementsByClassName('artdeco-models-table-row ember-view')[0].parentElement;
          else
          holder = document.getElementsByClassName('artdeco-list background-color-white')[0];

          var newApplicants;
          
          if(isOnLists())
          newApplicants = holder ? holder.getElementsByClassName('artdeco-models-table-row ember-view') : null;
          else
          newApplicants = holder ? holder.getElementsByClassName('artdeco-list__item pl3 pv3') : null;

          if (newApplicants) {

            //CLICK ON THE FIRST ONE?????
            if(isOnLists())
            document.getElementsByClassName('artdeco-models-table-row ember-view')[0].querySelector('[aria-label="Lead Name"]').children[0].click()
            else
            document.getElementsByClassName('artdeco-list__item pl3 pv3')[0].querySelector('[data-control-name="view_lead_panel_via_search_lead_name"]').click();

            processNextApplicantS();
          } else {
              NaturalEnd();
          }
      } else {
          NaturalEnd();
      }
  }
}

async function processApplicantS() {
  try {
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      var resumeID = null;

      var accID;
      var accType;
      try {
        const storageData = await getFromChromeStorage(['unnanu_token', 'unnanu_id', 'unnanu_expiry', 'unnanu_type']);
        if (storageData.unnanu_token && storageData.unnanu_id) {
            const unnanuDataTemp = {
                token: storageData.unnanu_token,
                id: storageData.unnanu_id,
                type: storageData.unnanu_type
            };
      
            accID = unnanuDataTemp.id;
            accType = unnanuDataTemp.type === "hire" ? 1 : 0;
        }
      } catch(error) {
          console.error("Error fetching data from storage:", error);
      }

      //CHECK IF IT WAS ALREADY PUSHED
      while (Array.from(document.getElementById('hue-web-menu-outlet').querySelectorAll('*')).find(element => element.textContent.trim() === 'View LinkedIn profile') == undefined) {
          document.querySelector('div[data-x--lead--profile-card-actions]').children[0].children[2].children[0].click()
          await delay(Math.random() * 200 + 500);
      }

      const profileLink = Array.from(document.getElementById('hue-web-menu-outlet').querySelectorAll('*')).find(element => element.textContent.trim() === 'View LinkedIn profile').children[0].href;

      const importResult = await importProfileData(accType, accID, profileLink);
      if (importResult === 'alreadyImported') {
          console.log("Profile was previously imported. Skipping...");
          const mergedData = {
            url: profileLink,
            status: "already exists"
          };
          return mergedData;
      }

      const contactInfo = extractApplicantContactInfoS();

      //fullname selector changed from .name-title-container to  ' vGgKoPqNtKBHtthxHDJxjBngqecAcY  '      extras : - "inline t-24 v-align-middle break-words"
      const nameAndApplication = document.querySelector('h1').children[0]?.innerText || null;
      const location = document.querySelector('.lockup-links-container').children[0]?.innerText || null;

      //Click to expand desc
      if(document.querySelector('#about-section') != null)
      if(document.querySelector('#about-section').children[1].children[1].children[0] != undefined)
      document.querySelector('#about-section').children[1].children[1].children[0].click()

      await delay(Math.random() * 500 + 1000);

      var longDescription = null;

      if(document.querySelector('#about-section') != null)
      longDescription =  document.querySelector('#about-section').children[1].innerHTML.trim().split('<button class')[0].trim() || null;


      //Expand all - experience
      let experiences = [];

      if(document.getElementById('scroll-to-experience-section').children[1] != undefined)
      document.getElementById('scroll-to-experience-section').children[1].click();

      await delay(Math.random() * 500 + 1000);

      const experienceList = document.querySelector('.experience-list').children;
      if(experienceList == undefined){
        experiences = null;
      }else{

          for (let i = 0; i < experienceList.length; i++) {
            const exp = experienceList[i];

            // Check if nested
            if(exp.querySelector('.experience-positions-list') != null){
              //nested
              
              let company = exp.querySelector('.company-lockup-container').querySelector('[data-anonymize="company-name"]')?.innerText || null;
              const nesetElements = exp.querySelector('.experience-positions-list').children;

              for(let j=0; j < nesetElements.length; j++){

                let jobTitle = nesetElements[j].querySelector('[data-anonymize="job-title"]')?.innerText || null;
                let period = nesetElements[j].querySelector('[class^="_position-time-period-range_"]')?.innerText || null;             
                let location = nesetElements[j].querySelector('.position-location')?.innerText || null;      
                  
                  if (company) {
                      experiences.push({
                          jobTitle: jobTitle,
                          companyName: company,
                          date: period,
                          location: location
                      });
                  }
              }

            }else{
              //regular

              let company = exp.querySelector('[data-anonymize="company-name"]')?.innerText || null;
              let jobTitle = exp.querySelector('[data-anonymize="job-title"]')?.innerText || null;
              let period =  exp.querySelector('[class^="_position-time-period-range_"]')?.innerText || null;       
              let location = exp.querySelector('.position-location')?.innerText || null;        
                
                if (company) {
                    experiences.push({
                        jobTitle: jobTitle,
                        companyName: company,
                        date: period,
                        location: location
                    });
                }

            }
            

         }

      }


      //Extract domain
      var domain = null;
      var companyPage = null;

      companyPage = document.querySelector('.experience-list').children[0].querySelector('[data-anonymize="company-name"]').parentElement.href;

      if(companyPage != undefined){
          const domainFromCompany = await extractDomainS(companyPage);
          domain = domainFromCompany;
      }

      
      

      //Expand all - education 
      if(document.querySelector('[data-sn-view-name="lead-education"]') != undefined)
      if(document.querySelector('[data-sn-view-name="lead-education"]').children.length == 2)
      document.querySelector('[data-sn-view-name="lead-education"]').children[1].click()

      await delay(Math.random() * 500 + 1000);

      let educations = [];
      var educationList = undefined

      if(document.querySelector('[data-sn-view-name="lead-education"]') != undefined)
      educationList = document.querySelector('[data-sn-view-name="lead-education"]').querySelector('.education-list').children;

      if(educationList == undefined){
        educations = null;
      }else{
          for (let i = 0; i < educationList.length; i++) {
            const edu = educationList[i];
            
            var schoolName = edu.querySelector('[data-anonymize="education-name"]')?.innerText || null;
            var degreeAndField = null, dateRange = null;

            if(edu.querySelector('.school-content').children[1].innerText.includes(' – ')){
              //only date
              dateRange = edu.querySelector('.school-content').children[1].innerText.replace('Dates attended or expected graduation\n','');
            }else{
              degreeAndField = edu.querySelector('.school-content').children[1].innerText.replace('Degree name\n','').replace('\nField of study\n','');
              dateRange = edu.querySelector('.school-content').children[2]?.innerText.replace('Dates attended or expected graduation\n','') || null;

              if(dateRange == 'Dates attended or expected graduation')
              dateRange = null;
            }
            
              
            if (schoolName) {
              educations.push({
                  schoolName: schoolName,
                  dateRange: dateRange,
                  degreeAndField: degreeAndField

              });
          }
        }
    }


      var skills = [];
      //Do the same for skills
      if(document.querySelector('.skills-content').parentElement.children.length == 2){
        //external skill extacting
        var urlForSkills = document.querySelector('.skills-content').parentElement.children[1].href;
        skills = await extractSkillsFromSales(urlForSkills);

      }else{
        //skills on the same page
        const skillsList =  document.querySelector('.skills-content').children[1].children;
        if(skillsList == undefined){
          skills = null;
        }else{
          for (let i = 0; i < skillsList.length; i++) {
            const skill = skillsList[i];
            
            var skillData = skill.children[0].innerText || null;
            var endorsementCount = '0';
  
            if(skill.children[1] != undefined)
            endorsementCount = skill.children[1].innerText.replace(' endorsements','');
              
            if (skillData) {
              skills.push({
                skill: skillData,
                endorsementCount: endorsementCount
              });
          }
        }
        }

      }






      const scrapedData = {
          fullName: nameAndApplication,
          longDescription: longDescription,
          location: location,
          url: profileLink
      };

      const mergedData = { ...scrapedData, ...contactInfo, resumeID, experiences, educations, skills, domain };
      return mergedData;

  } catch (error) {
      console.error("Error processing applicant:", error);
      return null;
  }
}

function extractApplicantContactInfoS() {
  return {
      email: null,
      phone: null  
  };
}

//--------------------------------------------------
//--------------------------------------------------

async function wiatForLoadingToFinish() {
  return new Promise((resolve) => {
      function checkForBadge() {
          // Try to get the element
          var tagToLoad = document.querySelector('._loading_1993de');

          // Check if the element has the desired class
          if (tagToLoad) {
              // If the condition is met, resolve the promise
              setTimeout(checkForBadge, 250);
          } else {
              // If not, wait for 250 milliseconds and check again
              resolve(tagToLoad);

          }
      }

      // Start the initial check
      checkForBadge();
  });
}

function goToNextPageS() {
  const paginationElem = document.querySelector('.artdeco-pagination__pages.artdeco-pagination__pages--number');
  if (!paginationElem || paginationElem.children.length < 1) return false;

  const pagesList = paginationElem.children;
  if (!pagesList) return false;

  // Find the current active page
  const currentPageIndex = Array.from(pagesList).findIndex(page => page.querySelector('button[aria-current="true"]'));
  
  if (currentPageIndex === -1 || currentPageIndex === pagesList.length - 1) return false; // no next page

  const nextPageButton = pagesList[currentPageIndex + 1].querySelector('button');
  if (!nextPageButton) return false;

  nextPageButton.click();
  return true;
}

async function extractDomainS(CompanyHref) {
  const domainData = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "scrapeDomainS", profileName: CompanyHref }, (response) => {
        if (response && response.domainDataBck) {
            resolve(response.domainDataBck);
        } else {
            reject(new Error("Failed to get domain data"));
        }
    });
  }).catch(error => {
    console.error("Error fetching domain data:", error);
  });


  return domainData;
}

async function extractSkillsFromSales(skillsURL) {
  const domainData = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "scrapeSkillsSales", profileName: skillsURL }, (response) => {
        if (response && response.domainDataBck) {
            resolve(response.domainDataBck);
        } else {
            reject(new Error("Failed to get domain data"));
        }
    });
  }).catch(error => {
    console.error("Error fetching domain data:", error);
  });


  return domainData;
}



//Scrape Projects-----------------
var numberOfApplicants = 0;

async function ScrapeProjects() {
  console.log("Scrape Projects started!");
  isScrapingInProgress = true;

  const wasReloadedDueToVirusScan = await new Promise(resolve => {
    chrome.storage.local.get('reloadedDueToVirusScan', function(data) {
        resolve(data.reloadedDueToVirusScan);
    });
});

  if(wasReloadedDueToVirusScan){
    //nothing
  }else{
    await showLimitPopup();
  }
  
  showOverlay();
  stopScraping = false;
  chrome.storage.local.set({ 'isRunningP': true });

  allData.jobData = await ScrapeJobDataP();

  console.log("Job Data")
  console.log(allData.jobData)

  while (true) {
    const element = document.querySelector('.profile-list');
    if (element) {
      console.log('Element found - profile list 1!');
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if(document.querySelector('[data-test-sourcing-channels-link-project-channel="applicants"]') != null){
    while (true) {
      const element = document.querySelector('[data-test-sourcing-channels-link-project-channel="applicants"]');
      if (element) {
        console.log('Element found - applicants buttn!');
        document.querySelector('[data-test-sourcing-channels-link-project-channel="applicants"]').click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }


  while (true) {
    const element = document.querySelector('.profile-list');
    if (element) {
      console.log('Element found - profile list 2!');
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }



  const holder = document.getElementsByClassName('ember-view profile-list')[0];
  if (!holder) {
      console.error("Holder not found");
      return;
  }

  numberOfApplicants = parseInt(document.getElementsByClassName('ember-view  mini-pagination profile-list__mini-pagination')[0].innerText.split('\n')[0].split(' – ')[1]);

  const applicants = holder.children;
  if (!applicants || numberOfApplicants === 0) {
      console.error("No applicants found");
      return;
  }

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  await delay(Math.random() * 500 + 1500);


  //CLICK THE FIRST TO OPEN THE WINDOW
  document.getElementsByClassName('lockup__content-title')[0].children[0].children[0].children[0].click()

  // Start processing the first applicant
  processNextApplicantP();
}

async function processNextApplicantP() {
  if (stopScraping) {
    NaturalEnd();
    return;  
  }

updateProfilesCount();
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

console.log("Process next applicant");
console.log("Current index is " + currentApplicantIndex + " < " + numberOfApplicants);

//Waitig for data to load
try {
  const elementWithBadge = await waitForLockupBadge();
  console.log('Element with class "lockup-badges" found!');
} catch (error) {
  console.error('Error waiting for element with class "lockup-badges":', error);
}

await delay(Math.random() * 500 + 2000);


if (currentApplicantIndex < numberOfApplicants) {
    const applicantData = await processApplicantP();

    console.log("+ Scraped project data")
    
    if (applicantData || applicantData.status == "already exists") {
        console.log("++ Push project data")
        allData.applicants.push(applicantData);
    }    

    currentApplicantIndex++;
    console.log(applicantData)

    //waitBeforeContinuing
    await delay(Math.random() * 500 + 1000);
    document.getElementsByClassName('pagination skyline-pagination pagination-header__pagination')[0].children[2].click()
    processNextApplicantP();

  } else {

    console.log("ENTERED THE NEXT PAGE LOGIC")

      // Check for the next page
      const isNextPageAvailable = goToNextPage();
      if (isNextPageAvailable) {
          // Here, we wait for the new page to load and then resume scraping.
          // Depending on the LinkedIn loading time, you might need to adjust this wait time.
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Reset currentApplicantIndex and get the new set of applicants
          currentApplicantIndex = 0;
          const holder = document.querySelector('.artdeco-list');
          const newApplicants = holder ? holder.querySelectorAll('.hiring-applicants__list-item') : null;
          if (newApplicants) {

            //CLICK ON THE NEXT BUTTON
            document.getElementsByClassName('pagination skyline-pagination pagination-header__pagination')[0].children[2].click()
            processNextApplicantP();
          } else {
              NaturalEnd();
          }
      } else {
          NaturalEnd();
      }
  }
}

async function processApplicantP() {
  try {
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      var resumeID = generateID();
      await delay(Math.random() * 500 + 1000);

      var accID;
      var accType;
      try {
        const storageData = await getFromChromeStorage(['unnanu_token', 'unnanu_id', 'unnanu_expiry', 'unnanu_type']);
        if (storageData.unnanu_token && storageData.unnanu_id) {
            const unnanuDataTemp = {
                token: storageData.unnanu_token,
                id: storageData.unnanu_id,
                type: storageData.unnanu_type
            };
      
            accID = unnanuDataTemp.id;
            accType = unnanuDataTemp.type === "hire" ? 1 : 0;
        }
      } catch(error) {
          console.error("Error fetching data from storage:", error);
      }

      //CHECK IF IT WAS ALREADY PUSHED
      document.getElementById('topcard-public-profile-hoverable-btn').click()
      await delay(Math.random() * 500 + 1000);

      const profileLink = document.getElementsByClassName('artdeco-hoverable-content artdeco-hoverable-content--visible')[0].children[0].children[1].children[0].href;

      const importResult = await importProfileData(accType, accID, profileLink);
      if (importResult === 'alreadyImported') {
          console.log("Profile was previously imported. Skipping...");
          const mergedData = {
            url: profileLink,
            status: "already exists"
          };
          return mergedData;
      }

      //DOWNLOAD RESUME
      var returnedFilename;
      if(document.getElementsByClassName('accordion-header job-application-details__compact--resume-header').length == 0){
        resumeID = null;
      }else{
        returnedFilename = await downloadAndUploadResumeP(resumeID);
        returnedFilename = returnedFilename.replace("\"","");
        if (!returnedFilename) {
            resumeID = null;
        } else {
            resumeID = returnedFilename;
        }
      }


      await delay(Math.random() * 500 + 1000);


      const contactInfo = extractApplicantContactInfoP();


      const applicantHeader = document.querySelector('.topcard-condensed').children[0].children[0].children[0];
      const nameAndApplication = applicantHeader?.children[0].children[0].children[1].children[0].children[0]?.innerText || null;
      const jobAndSkills = applicantHeader?.children[0].children[0].children[1].children[1]?.innerText || null;
      const location = document.getElementsByClassName('artdeco-entity-lockup__metadata ember-view')[0]?.innerText.split(' · ')[0].replace('· ','') || null;

      //Click to expand desc
      if(document.getElementsByClassName('summary-card__section')[0] != undefined && document.getElementsByClassName('summary-card__section')[0].getElementsByClassName('lt-line-clamp__ellipsis')[0]?.children[1] != undefined)
      document.getElementsByClassName('summary-card__section')[0].getElementsByClassName('lt-line-clamp__ellipsis')[0]?.children[1].click();

      await delay(Math.random() * 500 + 1000);

      var longDesc;
      if(document.getElementsByClassName('summary-card__section')[0] == undefined)
      longDesc = null
      else
      longDesc = document.getElementsByClassName('summary-card__section')[0].innerText;



      //Expand all - experience
      let experiences = [];

      if(document.getElementsByClassName('background-section experience-card')[0]?.children[1].children[3] != undefined)
      document.getElementsByClassName('background-section experience-card')[0]?.children[1].children[3].click();

      await delay(Math.random() * 500 + 1000);

      const experienceList = document.getElementsByClassName('background-section experience-card')[0]?.children[1].children[1].children;

      if(experienceList == undefined){
        experiences = null;
      }else{
          for (let i = 0; i < experienceList.length; i++) {
            const exp = experienceList[i];
            
            let jobTitle = exp.querySelector('.background-entity__summary-definition--title')?.innerText || null;
            let company = exp.querySelector('.background-entity__summary-definition--subtitle')?.innerText.split(' · ')[0] || null;
            let period = exp.querySelector('.background-entity__summary-definition--date-duration')?.innerText.split(' • ')[0] || null;        
              
              if (company) {
                  experiences.push({
                      jobTitle: jobTitle,
                      companyName: company,
                      date: period
                  });
              }
         }
      }

      //Extract domain
      var domain = null;
      var companyPage = null;

      if(document.getElementsByClassName('expandable-list-profile-core__list-item').length > 0){

      if(document.getElementsByClassName('expandable-list-profile-core__list-item')[0].parentElement.className == 'experience__resume-title-container'){
        if(document.getElementsByClassName('expandable-list-profile-core__list-item')[1].querySelector('a').className == 'logo-container__link')
        companyPage = document.getElementsByClassName('expandable-list-profile-core__list-item')[1].querySelector('a').href;
      }else{
        if(document.getElementsByClassName('expandable-list-profile-core__list-item')[1].querySelector('a').className == 'logo-container__link')
        companyPage = document.getElementsByClassName('expandable-list-profile-core__list-item')[0].querySelector('a').href;
      }

      if(companyPage != null){
          const domainFromCompany = await extractDomainP(companyPage);
          domain = domainFromCompany;
      }

      }
      

      //Expand all - education
      if(document.getElementsByClassName('background-section education-card')[0]?.children[0].children[3] != undefined)
      document.getElementsByClassName('background-section education-card')[0]?.children[0].children[3].click();

      await delay(Math.random() * 500 + 1000);

      let educations = [];
      const educationList = document.getElementsByClassName('background-section education-card')[0]?.children[0].children[1].children;

      if(educationList == undefined){
        educations = null;
      }else{
          for (let i = 0; i < educationList.length; i++) {
            const edu = educationList[i];
            
            var schoolName = edu.getElementsByClassName('background-entity__summary-definition--title')[0]?.innerText || null;
            var description =  edu.getElementsByClassName('background-entity__description-container education-entity')[0].children[1]?.innerText || null;  
            var dateRange =  edu.getElementsByClassName('background-entity__summary-definition--date-duration')[0]?.innerText || null;  
            var degreeAndField =  edu.getElementsByClassName('degree-summary')[0]?.innerText.split('\n') || null;  
            var filteredArray;
            var combinedString;

            if(degreeAndField == undefined){
              filteredArray = null;
              combinedString = null;
            }else{
              filteredArray = degreeAndField.filter((value, index) => index % 2 !== 0 && index !== 0);
              combinedString = filteredArray.join('');
            }

              
            if (schoolName) {
              educations.push({
                  schoolName: schoolName,
                  description: description,
                  dateRange: dateRange,
                  degreeAndField: combinedString

              });
          }
        }
    }


      //Do the same for skills
      document.getElementsByClassName('expandable-list expandable-stepper expandable-list-profile-core component-card skills-card-expandable')[0]?.children[3].click();
      await delay(Math.random() * 500 + 1000);

      var skills = [];
      const skillsList =  document.getElementsByClassName('expandable-list expandable-stepper expandable-list-profile-core component-card skills-card-expandable')[0]?.children[1].children;
      
      if(skillsList == undefined){
        skills = null;
      }else{
        for (let i = 0; i < skillsList.length; i++) {
          const skill = skillsList[i];
          
          var skillData = skill.children[0]?.children[0].innerText || null;
          var endorsementCount = '0';

          if(skill.querySelector('svg[data-test-icon="people-medium"]') != null)
          endorsementCount = skill.querySelector('svg[data-test-icon="people-medium"]').parentElement.nextElementSibling.innerText.split(' ')[0]
            
          if (skillData) {
            skills.push({
              skill: skillData,
              endorsementCount: endorsementCount
            });
        }
      }
      }


      const scrapedData = {
          fullName: nameAndApplication,
          shortDescription: jobAndSkills,
          longDescription: longDesc,
          location: location,
          url: profileLink
      };

      const mergedData = { ...scrapedData, ...contactInfo, resumeID, experiences, educations, skills, domain };
      return mergedData;

  } catch (error) {
      console.error("Error processing applicant:", error);
      return null;
  }
}



async function waitForLockupBadge() {
  return new Promise((resolve) => {
      function checkForBadge() {
          // Try to get the element
          var tagToLoad = document.getElementsByClassName('artdeco-entity-lockup__content lockup__content ember-view')[0]?.children[0]?.children[2];

          // Check if the element has the desired class
          if (tagToLoad && tagToLoad.classList.contains('lockup-badges')) {
              // If the condition is met, resolve the promise
              resolve(tagToLoad);
          } else {
              // If not, wait for 250 milliseconds and check again
              setTimeout(checkForBadge, 250);
          }
      }

      // Start the initial check
      checkForBadge();
  });
}

async function downloadAndUploadResumeP(resumeID) {
  console.log("Starting download for:", resumeID);

  const linkElement = document.getElementsByClassName('accordion-header job-application-details__compact--resume-header')[0].nextElementSibling.children[0].href

  if (!linkElement) {
    console.error("Download link not found for:", resumeID);
    return null;
  }

  try {
    const response = await fetch(linkElement);
    
    if (!response.ok) {
      console.error('Error downloading file:', await response.text());
      return false;
    }

    let fileExtension = 'pdf';  // default to pdf
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        fileExtension = filenameMatch[1].split('.').pop();
      }
    }

    const blob = await response.blob();
    const formData = new FormData();
    formData.append('resume', blob, `${resumeID}.${fileExtension}`);

    const uploadResponse = await fetch(`https://plugin.unnanu.com/upload?endpointType=${endpointType}`, {
      method: 'POST',
      body: formData
    });

    if (uploadResponse.ok) {
      console.log('Upload successful for:', resumeID);
      return `${resumeID}.${fileExtension}`;
    } else {
      console.error('Error uploading to server:', await uploadResponse.text());
      return false;
    }

  } catch (err) {
    console.error('Error for', resumeID, ':', err);
    return false;
  }
}

function extractApplicantContactInfoP() {

  const parentElement = document.getElementsByClassName('topcard-condensed__content')[0].children[0].children[0].children[1];
  
  var emailElement = parentElement.children[0].innerText.split('\n')[0];
  var phoneElement = parentElement.children[1].innerText.split('\n')[0];

  if(emailElement == "Add email")
  emailElement = null;

  if(phoneElement == "Add phone number")
  phoneElement = null;


  return {
      email: emailElement,
      phone: phoneElement  
  };
}

function StopScrapingP() {
  stopScraping = true;
  chrome.storage.local.set({ 'stopInitiatedP': true });
  chrome.storage.local.set({ 'isRunningP': false });
}

function StopScrapingS() {
  stopScraping = true;
  chrome.storage.local.set({ 'stopInitiatedS': true });
  chrome.storage.local.set({ 'isRunningS': false });
}

async function extractDomainP(CompanyHref) {
  const domainData = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "scrapeDomain", profileName: CompanyHref }, (response) => {
        if (response && response.domainDataBck) {
            resolve(response.domainDataBck);
        } else {
            reject(new Error("Failed to get domain data"));
        }
    });
  }).catch(error => {
    console.error("Error fetching domain data:", error);
  });


  return domainData;
}
//Scrape Projects-----------------




async function processNextApplicant(applicants) {
  if (stopScraping) {
    NaturalEnd();
    return;  
}
updateProfilesCount();
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

console.log("Process next applicant");
console.log("Current index is " + currentApplicantIndex + " < " + applicants.length);

const wasReloadedDueToVirusScan = await new Promise(resolve => {
    chrome.storage.local.get('reloadedDueToVirusScan', function(data) {
        resolve(data.reloadedDueToVirusScan);
    });
});

// If the page was reloaded due to the virus scan, then wait until enough applicants are loaded.
if (wasReloadedDueToVirusScan) {
  console.log("Waiting for enough applicants to load after reload...");

  let checkInterval = 1000;  // Every 100ms
  let maxAttempts = 5;     // Max 5 seconds (50 * 100ms)
  let attempts = 0;

  while (currentApplicantIndex >= applicants.length && attempts < maxAttempts) {
      console.log("current index is " + currentApplicantIndex);
      console.log("length is " + applicants.length);

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      attempts++;
  }

  if (currentApplicantIndex < applicants.length) {
      console.log("Applicants loaded.");
  } else {
      console.log("Max attempts reached without loading all applicants.");
  }

  // Clear the reload flag once we've waited
  chrome.storage.local.set({ 'reloadedDueToVirusScan': false });
}


if (currentApplicantIndex < applicants.length) {
    const applicantData = await processApplicant(applicants[currentApplicantIndex]);

    console.log("+ Scraped data")
    
    if ((applicantData && applicantData.email) || applicantData.status == "already exists") {
        console.log("++ Push data")
        allData.applicants.push(applicantData);
    }    

    currentApplicantIndex++;
    //waitBeforeContinuing
    await delay(Math.random() * 500 + 1000);
    NextStep();

  } else {

      // Check for the next page
      const isNextPageAvailable = goToNextPage();
      if (isNextPageAvailable) {
          // Here, we wait for the new page to load and then resume scraping.
          // Depending on the LinkedIn loading time, you might need to adjust this wait time.
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Reset currentApplicantIndex and get the new set of applicants
          currentApplicantIndex = 0;
          const holder = document.querySelector('.artdeco-list');
          const newApplicants = holder ? holder.querySelectorAll('.hiring-applicants__list-item') : null;
          if (newApplicants) {
              processNextApplicant(newApplicants);
          } else {
              NaturalEnd();
          }
      } else {
          NaturalEnd();
      }
  }
}

async function processApplicant(applicant) {
  try {
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      var resumeID = generateID();

      // Trigger the click for the given applicant
      if (applicant.children && applicant.children[0]) {
          applicant.children[0].click();
          await delay(Math.random() * 1000 + 1000);
      } else {
          console.error(`Failed to click the applicant`);
          return null;
      }

      const ember206Btn = document.querySelector('.hiring-applicant-header-actions')?.children[2]?.children[0];
      if (ember206Btn) {
          if (isFirstTime) {
              ember206Btn.click();
              isFirstTime = false;
          }
      } else {
          console.error(`#ember206 button not found for the applicant`);
          return null;
      }

      //APPLICANT IS OPEN
      await delay(Math.random() * 500 + 1000);

      //CHECK IF HE WAS SENT
      while (!document.querySelector('.hiring-applicant-header-actions')?.children[2]?.children[1]?.children[0]) {
        ember206Btn.click();
        await delay(Math.random() * 500 + 1000);
      }

      var accID;
      var accType;
      try {
        const storageData = await getFromChromeStorage(['unnanu_token', 'unnanu_id', 'unnanu_expiry', 'unnanu_type']);
        if (storageData.unnanu_token && storageData.unnanu_id) {
            const unnanuDataTemp = {
                token: storageData.unnanu_token,
                id: storageData.unnanu_id,
                type: storageData.unnanu_type
            };
      
            accID = unnanuDataTemp.id;
            accType = unnanuDataTemp.type === "hire" ? 1 : 0;
        }
      } catch(error) {
          console.error("Error fetching data from storage:", error);
      }

      const ember444Element = document.querySelector('.hiring-applicant-header-actions')?.children[2]?.children[1]?.children[0]?.children[0]?.children[0]?.children[0]?.children[0];
      if (!ember444Element) {
          console.error(`Element #ember444 not found for the applicant`);
          return null;
      }

      //CHECK IF IT WAS ALREADY PUSHED
      const profileLink = ember444Element.href;
      const importResult = await importProfileData(accType, accID, profileLink);
      if (importResult === 'alreadyImported') {
          console.log("Profile was previously imported. Skipping...");
          const mergedData = {
            url: profileLink,
            status: "already exists"
          };
          return mergedData;
      }      


      //CHECK FOR VIRUS CHECK
      var virusScanSection = document.querySelector('.hiring-resume-viewer__virus-scan-section.ph5.pv4');
      if (virusScanSection) {
          const currentURL = window.location.href;
          chrome.storage.local.set({
              'resumeScrapingData': {
                  'allData': allData,
                  'currentApplicantIndex': currentApplicantIndex,
                  'url': currentURL,
              }
          });

          if(stopScraping){
            NaturalEnd();
            return;  
          }

          chrome.storage.local.set({ 'reloadedDueToVirusScan': true });
          window.location.reload();
          return;
      }

      const showMoreBtns = document.getElementsByClassName('artdeco-button artdeco-button--icon-right artdeco-button--1 artdeco-button--tertiary ember-view');
      for (let btn of showMoreBtns) {
          btn.click();
          await delay(Math.random() * 500 + 700);
      }

      //DOWNLOAD RESUME
      var returnedFilename = await downloadAndUploadResume(resumeID);
      if (!returnedFilename || typeof returnedFilename !== 'string') {
          console.error("An error occurred or an invalid filename was returned:", returnedFilename);
          resumeID = null;
      } else {
          returnedFilename = returnedFilename.replace("\"","");
          resumeID = returnedFilename;
      }
      

      await delay(Math.random() * 500 + 1000);

      const ulElement = ember444Element.parentElement?.parentElement?.parentElement;
      const contactInfo = ulElement ? extractApplicantContactInfo(ulElement) : null;

      if (contactInfo) {
          chrome.runtime.sendMessage({ action: "contactInfo", data: contactInfo });
      }

      const applicantHeader = document.querySelector('.hiring-applicant-header.artdeco-card.p0');
      const nameAndApplication = applicantHeader?.querySelector('h1')?.innerText.trim().split('’')[0] || null;
      const jobAndSkills = applicantHeader?.querySelectorAll('div.t-16')[0]?.textContent.trim() || null;
      const location = applicantHeader?.querySelectorAll('div.t-16')[1]?.textContent.trim() || null;

      let experiences = [];
      const experienceSection = document.getElementsByClassName('artdeco-card mt4 p0')[0];
      if (experienceSection) {
        const experienceList = experienceSection.querySelectorAll('section > ul.list-style-none > li:not(.visually-hidden)');
        experienceList.forEach(exp => {
            let jobTitle = exp.querySelector('p.t-14.t-black')?.textContent.trim() || null;
            let company = exp.querySelector('p.t-14.t-black--light')?.textContent.trim() || null;
            let period = exp.querySelector('p.t-12.t-black--light > span[aria-hidden="true"]')?.textContent.trim() || null;
            
            if (company) {
                experiences.push({
                    jobTitle: jobTitle,
                    companyName: company,
                    date: period
                });
            }
        });
    }

      let educations = [];
      const educationList = experienceSection?.querySelectorAll('section.mt4 > ul.list-style-none > li') || [];
      if(educationList){
        educationList.forEach(edu => {
          let schoolName = edu.querySelector('p.t-14')?.textContent.trim() || null;

          var degreeAndField = null;
          var dateRange = null;
          
          var numOfGrayTxt = edu.querySelectorAll('p.t-12.t-black--light').length;

          if(numOfGrayTxt == 2){
            //has degree and date
            degreeAndField = edu.querySelectorAll('p.t-12.t-black--light')[0]?.textContent.trim() || null;
            dateRange = edu.querySelectorAll('p.t-12.t-black--light')[1].textContent.trim().split('\n')[3].trim() || null;

          }else if(numOfGrayTxt == 0){
            dateRange = null;
            degreeAndField = null;

          }else if(numOfGrayTxt == 1){
            //has only date ( with - ) OR only degree
            if(edu.querySelectorAll('p.t-12.t-black--light')[0].innerText.includes('Years')){
              //only date
              dateRange = edu.querySelectorAll('p.t-12.t-black--light')[0].textContent.trim().split('\n')[3].trim() || null;  
            }else{
              //only degree
              degreeAndField = edu.querySelectorAll('p.t-12.t-black--light')[0]?.textContent.trim() || null;
            }

          }


          
          if (schoolName) {
              educations.push({
                  schoolName: schoolName,
                  degreeAndField: degreeAndField,
                  dateRange: dateRange
              });
          }
      });
      }


      const scrapedData = {
          fullName: nameAndApplication,
          shortDescription: jobAndSkills,
          location: location,
          domain: null,
          url: profileLink
      };

      var skills = await extractSkillsFromApplicants(profileLink);

      const mergedData = { ...scrapedData, ...contactInfo, resumeID, experiences, educations, skills };
      return mergedData;

  } catch (error) {
      console.error("Error processing applicant:", error);
      return null;
  }
}




function importProfileData(hireOrTalent, userId, linkedinProfile) {

  const matched = linkedinProfile.match(/linkedin\.com\/in\/([\w\-]+)/);
  if (!matched) {
    console.error("Invalid LinkedIn URL provided");
    return null;
  }
  const linkedinName = matched[1];
  
  // Construct the cleaned LinkedIn URL
  const linkedinProfile_Cleaned = `https://www.linkedin.com/in/${linkedinName}/`;

  console.log("CHECK " + userId + " " + linkedinProfile_Cleaned)

  const apiUrl = `${APIstring}/api/v1/user/data/${hireOrTalent}/${userId}/profile?url=${linkedinProfile_Cleaned}&endpointType=${endpointType}`;
  
  return fetch(apiUrl)
      .then(response => {
          if (!response.ok) {
              throw new Error('Network response was not ok');
          }
          return response.json();
      })
      .then(data => { 
        console.log(data)         
          if (data.Code === 200 && data.Result === "Success" && data.Data === "Profile previously imported.") {
              return 'alreadyImported';
          }
          
          return data;
      })
      .catch(error => {
          console.log('There was a problem with the fetch operation:', error.message);
      });
}



async function extractSkillsFromApplicants(currentUrl) {
  const skills = [];

  // Extracting profileName from the URL
  const profileName = currentUrl.split('/in/')[1].split('/')[0]; 

  const skillsData = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "extractSkillsForProfile", profileName: profileName }, (response) => {
          resolve(response.skillsData);
      });
  });

  if (skillsData) {
    skills.push(...skillsData);
  }
  return skills;
}

function extractApplicantContactInfo(parentElement) {
  var emailElement = parentElement.children[1].children[0].querySelector('.hiring-applicant-header-actions__more-content-dropdown-item-text').innerText
  var phoneElement = parentElement.children[2].children[0].querySelector('.hiring-applicant-header-actions__more-content-dropdown-item-text').innerText

  emailElement = emailElement.trim();
  phoneElement = phoneElement.trim();

  return {
      email: emailElement,
      phone: phoneElement  
  };
}

async function downloadAndUploadResume(resumeID) {
  console.log("Starting download for:", resumeID);

  const downloadIconSelector = 'a.link-without-visited-state.t-16 svg[data-test-icon="download-medium"], a.ui-attachment__download-button svg[data-test-icon="download-medium"]';
  const linkElement = document.querySelector(downloadIconSelector)?.parentElement;

  if (!linkElement) {
    console.error("Download link not found for:", resumeID);
    return false;
  }

  try {
    const response = await fetch(linkElement.href);
    
    if (!response.ok) {
      console.error('Error downloading file:', await response.text());
      return false;
    }

    let fileExtension = 'pdf';  // default to pdf
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        fileExtension = filenameMatch[1].split('.').pop();
      }
    }

    const blob = await response.blob();
    const formData = new FormData();
    formData.append('resume', blob, `${resumeID}.${fileExtension}`);

    const uploadResponse = await fetch(`https://plugin.unnanu.com/upload?endpointType=${endpointType}`, {
      method: 'POST',
      body: formData
    });

    if (uploadResponse.ok) {
      console.log('Upload successful for:', resumeID);
      return `${resumeID}.${fileExtension}`;
    } else {
      console.error('Error uploading to server:', await uploadResponse.text());
      return false;
    }

  } catch (err) {
    console.error('Error for', resumeID, ':', err);
    return false;
  }
}

async function extractDomain() {
  const domainData = await new Promise((resolve, reject) => {
    const experienceSection = document.getElementById('experience');
    if (!experienceSection) {
      console.log("no 1")
      resolve(null);
      return;
    }

    const linkElement = experienceSection.nextElementSibling.nextElementSibling.children[0].children[0].querySelector('a[data-field="experience_company_logo"]')
    var companyUrl = linkElement.href;

    if (companyUrl.includes('/company/')) {
      var companyId = companyUrl.split('/company/')[1].split('/')[0];
      companyUrl = 'https://www.linkedin.com/company/' + companyId + '/?viewAsMember=true';
  }

    console.log("sending scrapeDomain content -> background")

    chrome.runtime.sendMessage({ action: "scrapeDomain", profileName: companyUrl }, (response) => {
        if (response && response.domainDataBck) {
            resolve(response.domainDataBck);
        } else {
            reject(new Error("Failed to get domain data"));
        }
    });
  }).catch(error => {
    console.error("Error fetching domain data:", error);
  });


  return domainData;
}


async function extractSkills() {
  const skills = [];
  const profileName = currentUrl.split('/in/')[1].split('/')[0]; 

  const skillsData = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "extractSkillsForProfile", profileName: profileName }, (response) => {
          resolve(response.skillsData);
      });
  });

  if (skillsData) {
    skills.push(...skillsData);
  }
  return skills;
}

async function extractEducation() {
  const education = [];
  const profileName = currentUrl.split('/in/')[1].split('/')[0]; 

  const educationData = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "extractEducation", profileName: profileName }, (response) => {
          resolve(response.educationData);
      });
  });

  if (educationData) {
    education.push(...educationData);
  }
  return education;
}

async function extractExperiences() {
  const experience = [];
  const profileName = currentUrl.split('/in/')[1].split('/')[0]; 

  const experienceData = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "extractExperience", profileName: profileName }, (response) => {
        if (response && response.experienceData) {
            resolve(response.experienceData);
        } else {
            reject(new Error("Failed to get experience data"));
        }
    });
  }).catch(error => {
    console.error("Error fetching experience data:", error);
  });

  if (experienceData) {
    experience.push(...experienceData);
  }
  return experience;
}

async function extractLicensesAndCertifications() {
  const certs = [];
  const profileName = currentUrl.split('/in/')[1].split('/')[0]; 

  const certData = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "extractLicensesAndCertificationsForProfile", profileName: profileName }, (response) => {
          resolve(response.certData);
      });
  });

  if (certData) {
    certs.push(...certData);
  }
  return certs;
}



function NaturalEnd() {
  console.log("-=-= Natural END =-=-");
  isScrapingInProgress = false;
  console.log("All data:", allData);
  hideOverlay();
  chrome.storage.local.set({ 'isRunning': false });
  chrome.storage.local.set({ 'isRunningP': false });
  chrome.storage.local.set({ 'isRunningS': false });

  allData.applicants.forEach(applicant => {
    // List of all required parameters
    const requiredParams = [
      'fullName', 'shortDescription', 'longDescription', 'connectionDegree', 
      'location', 'url', 'email', 'phone', 'birthday', 'resumeID', 'domain', 
      'status', 'skills', 'experiences', 'educations', 'licensesAndCertifications'
    ];
  
    // Check each required parameter
    requiredParams.forEach(param => {
      if (applicant[param] === undefined) {
        // Add the parameter with a value of null if it doesn't exist
        applicant[param] = null;
      }
    });
  });

  showLoadingPopup();
  sendScrapedDataToAPI()

  // Check if stop was initiated, if so, send the scrapingFullyStopped message
  chrome.storage.local.get('stopInitiated', function(data) {
      const wasStopInitiated = data.stopInitiated || false;

      if(wasStopInitiated) {
          chrome.runtime.sendMessage({ action: "scrapingFullyStopped" });
          chrome.storage.local.set({ 'stopInitiated': false }); // reset for the next possible scraping session
      }
  });

  chrome.storage.local.get('stopInitiatedP', function(data) {
      const wasStopInitiated = data.stopInitiatedP || false;

      if(wasStopInitiated) {
          chrome.runtime.sendMessage({ action: "scrapingFullyStoppedP" });
          chrome.storage.local.set({ 'stopInitiatedP': false }); // reset for the next possible scraping session
      }
  });

  chrome.storage.local.get('stopInitiatedS', function(data) {
    const wasStopInitiated = data.stopInitiatedS || false;

    if(wasStopInitiated) {
        chrome.runtime.sendMessage({ action: "scrapingFullyStoppedS" });
        chrome.storage.local.set({ 'stopInitiatedS': false }); // reset for the next possible scraping session
    }
  });
}

function StopScraping() {
    stopScraping = true;
    chrome.storage.local.set({ 'stopInitiated': true });
    chrome.storage.local.set({ 'isRunning': false });
}

function goToNextPage() {
  const paginationElem = document.querySelector('.artdeco-pagination');
  if (!paginationElem || paginationElem.children.length < 1) return false;

  const pagesList = paginationElem.children[0].children;
  if (!pagesList) return false;

  // Find the current active page
  const currentPageIndex = Array.from(pagesList).findIndex(page => page.querySelector('button[aria-current="true"]'));
  
  if (currentPageIndex === -1 || currentPageIndex === pagesList.length - 1) return false; // no next page

  const nextPageButton = pagesList[currentPageIndex + 1].querySelector('button');
  if (!nextPageButton) return false;

  nextPageButton.click();
  return true;
}


function updateProfilesCount() {
  chrome.storage.local.get('profilesCollected', function(data) {
      let currentCount = data.profilesCollected || 0; // If not yet saved, default to 0
      let newCount = currentCount + 1; // Increment the count   
      chrome.storage.local.set({'profilesCollected': newCount});
      chrome.runtime.sendMessage({ action: "updateTheCount" });
  });

  chrome.storage.local.get('profilesCollectedP', function(data) {
    let currentCount = data.profilesCollectedP || 0; // If not yet saved, default to 0
    let newCount = currentCount + 1; // Increment the count   
    chrome.storage.local.set({'profilesCollectedP': newCount});
    chrome.runtime.sendMessage({ action: "updateTheCount" });
});

chrome.storage.local.get('profilesCollectedS', function(data) {
  let currentCount = data.profilesCollectedS || 0; // If not yet saved, default to 0
  let newCount = currentCount + 1; // Increment the count   
  chrome.storage.local.set({'profilesCollectedS': newCount});
  chrome.runtime.sendMessage({ action: "updateTheCount" });
});
}


//------------------

function injectFontAwesome() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  console.log("aaaa")
  link.href = chrome.runtime.getURL('font-awesome.min.css');
  console.log(link.href)
  document.head.appendChild(link);
}

function injectStyles() {
  injectFontAwesome()
  const style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
      #notificationPopup {
          position: fixed;
          top: 50vh;
          left: 50vw;
          transform: translate(-50%, -50%);
          width: 70vw;
          height: 50vh;
          background-color: #256cde;
          border-radius: 5px;
          z-index: 99999999;
          border: 1px solid white;
          padding: 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
      }

      #notificationPopup .close {
        position: absolute;
        top: 5px;
        right: 15px;
        cursor: pointer;
        color: white;
        font-size: 2rem;
        z-index: 99999999;
      }

      #notificationPopup .status-icon {
          margin-bottom: 20px;
      }

      #notificationPopup .loading {
        border: 4px solid rgb(255 255 255 / 40%);
        border-radius: 50%;
        border-top: 4px solid #ffffff;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
      }

      @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
      }
  `;
  document.head.appendChild(style);
}


function showAlreadySentPopup() {
  console.log("Show already sent")
  let popup = createPopup();
  popup.innerHTML = `
  <span class="close">&#10005;</span>
  <i class="fa fa-exclamation-circle status-icon" style="color: white; font-size: 4rem;"></i>
  <p style="font-size: 3vh; color:white">This account was already sent.</p>
`;
  document.body.appendChild(popup);
  attachCloseListener();
}


function showLoadingPopup() {
  let popup = createPopup();
  popup.innerHTML = `
      <span class="close">&#10005;</span>
      <div class="loading"></div>
      <p style="font-size: 3vh; color:white">Sending data to the server...</p>
  `;
  document.body.appendChild(popup);
  attachCloseListener();
}

function showSuccessPopup() {
  let popup = createPopup();
  popup.innerHTML = `
      <span class="close">&#10005;</span>
      <i class="fa fa-check-circle status-icon" style="color: white;font-size: 4rem;"></i>
      <p style="font-size: 3vh; color:white">Data sent successfully!</p>
  `;
  attachCloseListener();
}

function showErrorPopup(textToShow) {
  let popup = createPopup();
  popup.innerHTML = `
  <span class="close">&#10005;</span>
  <i class="fa fa-exclamation-circle status-icon" style="color: white; font-size: 4rem;"></i>
  <p style="font-size: 3vh; color:white">${textToShow}</p>
`;

  attachCloseListener();
}

function showLimitPopup() {
  return new Promise((resolve) => {
    let popup = createPopup();
    popup.innerHTML = `
    <span class="close">&#10005;</span>
    <i class="fa fa-exclamation-circle status-icon" style="color: white; font-size: 4rem;"></i>
    <p style="font-size: 3vh; color:white">We don't recommend extracting 20+ <br> profiles at once to avoid any issues. <br><br>For better results, run multiple times <br>by stopping and starting with a refresh of the browser after every run.</p>
    <button id="startExtractionBtn" style="background-color: white; color: black; border:none; border-radius: 1vh; padding: 1.5vh; cursor: pointer; margin-top: 3vh;">I understand, start extracting</button>
    `;  

    document.body.appendChild(popup);

    const startExtractionBtn = document.getElementById("startExtractionBtn");
    startExtractionBtn.addEventListener("click", async () => {
      await closePopupNew();
      resolve();
    });

    attachCloseListenerNew();
  });
}

async function closePopupNew() {
  const popup = document.querySelector("#notificationPopup");
  document.body.removeChild(popup);
}

function attachCloseListenerNew() {
  const closeBtn = document.querySelector('#notificationPopup .close');
  closeBtn.addEventListener("click", closePopupNew);
}


function createPopup() {
  let popup = document.getElementById('notificationPopup');
  if (!popup) {
      popup = document.createElement('div');
      popup.id = 'notificationPopup';
  }
  return popup;
}

function hidePopup() {
  let popup = document.getElementById('notificationPopup');
  if (popup) {
      popup.remove();
  }
}

function attachCloseListener() {
  let closeBtn = document.querySelector('#notificationPopup .close');
  if (closeBtn) {
      closeBtn.addEventListener('click', hidePopup);
  }
}




function fetchTextContent(selector) {
  const element = document.querySelector(selector);
  return element ? element.textContent.trim() : null;
}

async function fetchModalData() {
  const allAElements = Array.from(document.querySelectorAll('a'));
  const contactInfoElement = allAElements.find(a => a.textContent.trim() === "Contact info");
  
  if (!contactInfoElement) {
    console.error('Contact info element not found.');
    return {};
  }

  contactInfoElement.click();

  const modalContent = await WaitForElemToLoad('[aria-labelledby=\"pv-contact-info\"]');

  if (!modalContent) {
    console.error("Modal content not found.");
    return {};
  }

  const phoneElement = document.querySelector('[data-test-icon="phone-handset-medium"]');
  const emailElement = document.querySelector('[data-test-icon="envelope-medium"]');
  const birthdayElement = document.querySelector('[data-test-icon="calendar-medium"]');
  
  const data = {
    phone: phoneElement ? phoneElement.nextElementSibling.nextElementSibling.children[0].children[0].innerText : null,
    email: emailElement ? emailElement.nextElementSibling.nextElementSibling.innerText : null,
    birthday: birthdayElement ? birthdayElement.nextElementSibling.nextElementSibling.innerText : null
  };
  
  // Close the modal
  const closeModalButton = document.querySelector('button[data-test-modal-close-btn]');
  if (closeModalButton) {
    closeModalButton.click();
  } else {
    console.error('Modal close button not found.');
  }

  return data;
}


//----------------

function showOverlay() {
  // Check if overlay already exists
  if (document.getElementById('scrapingOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'scrapingOverlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = '#000000bd';
  overlay.style.zIndex = '9999999'; // Ensure it's above everything else
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.pointerEvents = 'auto'; // this allows pointer events on the overlay itself
  document.body.style.pointerEvents = 'none'; // this disables pointer events on the entire body, effectively blocking interaction with elements behind the overlay
  
  const text = document.createElement('div');
  text.style.color = 'white';
  text.innerText = "Extracting in progress. This overlay prevents misclicks.";
  overlay.appendChild(text);

  document.body.appendChild(overlay);
}

function hideOverlay() {
  const overlay = document.getElementById('scrapingOverlay');
  if (overlay) {
      overlay.remove();
  }
  document.body.style.pointerEvents = 'auto'; // revert the body's pointer events to its original state
}


//Helper Functions----------------------

function fetchTextContentWithin(parentElement, selector) {
  const element = parentElement.querySelector(selector);
  return element ? element.textContent.trim() : null;
}

const sleep = async (milliseconds) => {
  await new Promise(resolve => {
    return setTimeout(resolve, milliseconds);
  });
}

async function WaitForElemToLoad(selector, maxWaitTime = 10000) {
  const startTime = Date.now();

  while ((Date.now() - startTime) < maxWaitTime) {
    const element = document.querySelector(selector);
    if (element) {
      await sleep(getRandomInt(500, 1000));
      return element;
    }
    await sleep(100); // Check every 100ms
  }

  console.error(`Element with selector ${selector} not found within ${maxWaitTime}ms.`);
  return null;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function waitForCondition(conditionFunc, maxWait = 10000, interval = 500) {
  let elapsed = 0;

  return new Promise((resolve, reject) => {
      const check = () => {
          if (conditionFunc()) {
              resolve();
          } else if (elapsed >= maxWait) {
              reject(new Error('Condition not met within max wait time'));
          } else {
              elapsed += interval;
              setTimeout(check, interval);
          }
      };

      check();
  });
}

function removePrefix(text, prefix) {
  if (text.startsWith(prefix)) {
      return text.substring(prefix.length).trim();
  }
  return text;
}

function cleanText(text) {
  return text.replace(/\n\s+/g, ' ').trim();
}

async function waitForElement(selector, timeout = 5000) {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
          const el = document.querySelector(selector);
          if (el) {
              clearInterval(interval);
              resolve(el);
          } else if (Date.now() - startTime > timeout) {
              clearInterval(interval);
              reject(new Error(`Waiting for element ${selector} timed out`));
          }
      }, 500);  // checking every 500ms
  });
}

function generateID() {
  // Get current time in UTC, convert to binary-like representation
  const now = new Date().getTime();
  const time = new Uint8Array(new BigInt64Array([BigInt(now)]).buffer);

  // Generate a pseudo-random GUID-like string in JavaScript
  // Note: JavaScript doesn't natively support GUIDs, so we use this as a workaround
  const key = new Uint8Array(16);
  crypto.getRandomValues(key);

  // Concatenate the arrays
  const combined = new Uint8Array([...time, ...key]);

  // Convert to Base64
  let token = btoa(String.fromCharCode(...combined));

  // Replace certain characters
  token = token.replace(/\//g, "0");
  token = token.replace(/\+/g, "0");

  return token;
}

function extractProfileNameFromLink(link) {
  const regex = /linkedin\.com\/in\/(.*?)\//;
  const match = link.match(regex);
  return match ? match[1] : null;
}

async function getFromChromeStorage(keys) {
  return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
          if(chrome.runtime.lastError){
              reject(new Error(chrome.runtime.lastError));
          } else {
              resolve(result);
          }
      });
  });
}