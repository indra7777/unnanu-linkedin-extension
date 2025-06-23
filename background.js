let lastScrapedData = null;
let originatingTabId = null;
let contactData = null;  // Store contact data temporarily


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "openNewTab") {
        const profileLink = request.url;

        originatingTabId = sender.tab.id;  // Remember the tab id of the original request
        
        chrome.storage.local.set({ 'shouldScrapeCurrent': true }, () => {
            chrome.tabs.create({ url: profileLink,  active: false }, (newTab) => {
                const tabId = newTab.id;

                // Listen for the tab to be fully loaded
                chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                    if (tabId === newTab.id && changeInfo.status === 'complete') {
                        // Tab is fully loaded, send the scrape command
                        chrome.tabs.sendMessage(tabId, { message: "scrapeCurrent" });

                        // Unregister the listener after using
                        chrome.tabs.onUpdated.removeListener(listener);
                    }
                });
                
                sendResponse({ status: 'Tab created and listener attached' });

            });
        });

        // Keep the message channel open until sendResponse is executed
        return true;
    }
    else if (request.action === "scrapedData") {
        lastScrapedData = request.data;

        if (lastScrapedData && contactData) {
            mergeAndSendData();
        }
    }
    else if (request.action === "contactInfo") {
        contactData = request.data;

        if (lastScrapedData && contactData) {
            mergeAndSendData();
        }
    }
    else if (request.action === "scrapingComplete") {
        chrome.tabs.remove(sender.tab.id);
    }

    if (request.action === "getCurrentTabUrl") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            sendResponse({ currentUrl: tabs[0].url });
        });
        
        // This is necessary for the asynchronous response to work
        return true;
    }




});

function mergeAndSendData() {
    const mergedData = { ...lastScrapedData, ...contactData };
    chrome.tabs.sendMessage(originatingTabId, { action: "finalScrapedData", data: mergedData });
    lastScrapedData = null;
    contactData = null;  // Reset both sets of data after sending
    
    // Adding delay
    const delay = Math.random() * 500 + 500;  // Random delay between 500ms to 1000ms
    setTimeout(() => {
        chrome.tabs.sendMessage(originatingTabId, { message: "resumeScraping" });
    }, delay);
}


chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (lastScrapedData && originatingTabId) {
        chrome.tabs.sendMessage(originatingTabId, { action: "finalScrapedData", data: lastScrapedData });
        lastScrapedData = null;  // Reset the data after sending
    }
});


//NEW TAB EXTRACTION--------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.action === "extractSkillsForProfile") {
        const profileName = message.profileName;
        const skillsPageURL = `https://www.linkedin.com/in/${profileName}/details/skills/`;

        chrome.tabs.create({ url: skillsPageURL, active: true }, (tab) => {
            const skillsTabId = tab.id;
    
            function startScrolling() {
                let noLoaderCounter = 0;

                function scrollAndCheck() {
                    scrollToBottomAndCheckLoader(skillsTabId).then(loaderPresent => {
                        if (loaderPresent || noLoaderCounter < 4) {
                            if (!loaderPresent) {
                                noLoaderCounter++;
                            }
                            setTimeout(scrollAndCheck, Math.random() * 250 + 1550); // Random wait before next scroll
                        } else {
                            scrapeAndSendData(skillsTabId, sendResponse);
                        }
                    });
                }

                scrollAndCheck();
            }

            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === skillsTabId && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    startScrolling();
                }
            });
            
            
        });

        return true;  // Keeps the message channel open
    }

    if (message.action === "extractLicensesAndCertificationsForProfile") {
        const profileName = message.profileName;
        const certificationsPageURL = `https://www.linkedin.com/in/${profileName}/details/certifications/`;

        chrome.tabs.create({ url: certificationsPageURL, active: true }, (tab) => {
            const certificationsTabId = tab.id;

            function startScrollingForCertifications() {
                let noLoaderCounter = 0;

                function scrollAndCheckForCertifications() {
                    scrollToBottomAndCheckLoader(certificationsTabId).then(loaderPresent => {
                        if (loaderPresent || noLoaderCounter < 4) {
                            if (!loaderPresent) {
                                noLoaderCounter++;
                            }
                            setTimeout(scrollAndCheckForCertifications, Math.random() * 250 + 1550); // Random wait before next scroll
                        } else {
                            scrapeAndSendCertificationsData(certificationsTabId, sendResponse);
                        }
                    });
                }

                scrollAndCheckForCertifications();
            }

            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === certificationsTabId && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    startScrollingForCertifications();
                }
            });
        });

        return true;  // Keeps the message channel open
    }
    
    if (message.action === "extractExperience") {
        const profileName = message.profileName;
        const experiencePageURL = `https://www.linkedin.com/in/${profileName}/details/experience/`;

        chrome.tabs.create({ url: experiencePageURL, active: true }, (tab) => {
            const experienceTabId = tab.id;

            function startScrollingForExperience() {
                let noLoaderCounter = 0;

                function scrollAndCheckForExperience() {
                    scrollToBottomAndCheckLoader(experienceTabId).then(loaderPresent => {
                        if (loaderPresent || noLoaderCounter < 4) {
                            if (!loaderPresent) {
                                noLoaderCounter++;
                            }
                            setTimeout(scrollAndCheckForExperience, Math.random() * 250 + 1550); // Random wait before next scroll
                        } else {
                            scrapeAndSendExperienceData(experienceTabId, sendResponse);
                        }
                    });
                }

                scrollAndCheckForExperience();
            }

            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === experienceTabId && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    startScrollingForExperience();
                }
            });
        });

        return true;  // Keeps the message channel open
    }


    if (message.action === "extractEducation") {
        const profileName = message.profileName;
        // Adjust the URL endpoint for education (This is a placeholder, replace it with the correct URL format for education)
        const educationPageURL = `https://www.linkedin.com/in/${profileName}/details/education/`;
    
        chrome.tabs.create({ url: educationPageURL, active: true }, (tab) => {
            const educationTabId = tab.id;
            setInterval(() => {
                console.log("education tab id is " + educationTabId)
            }, 2000);
            function startScrollingForEducation() {
                let noLoaderCounter = 0;
    
                function scrollAndCheckForEducation() {
                    scrollToBottomAndCheckLoader(educationTabId).then(loaderPresent => {
                        if (loaderPresent || noLoaderCounter < 4) {
                            if (!loaderPresent) {
                                noLoaderCounter++;
                            }
                            setTimeout(scrollAndCheckForEducation, Math.random() * 250 + 1550); // Random wait before next scroll
                        } else {
                            scrapeAndSendEducationData(educationTabId, sendResponse);
                        }
                    });
                }
                

                scrollAndCheckForEducation();
            }
    
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === educationTabId && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    startScrollingForEducation();
                }
            });
        });
    
        return true;  // Keeps the message channel open
    }


    if (message.action === "scrapeDomain") {
        const profileUrl = message.profileName;

        console.log("got scrapedomain message")

        chrome.tabs.create({ url: profileUrl, active: true }, function (tab) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {

                    function showOverlay(){
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
                        document.body.style.pointerEvents = 'none';
                        
                        const text = document.createElement('div');
                        text.style.color = 'white';
                        text.innerText = "Extracting in progress. This overlay prevents misclicks.";
                        overlay.appendChild(text);
                      
                        document.body.appendChild(overlay);
                    }

                    function extractDomainScript() {
                        // Helper function to extract the main domain from a URL string
                        function extractMainDomain(url) {
                            let hostname;

                            console.log("domain is " + url)
                        
                            // Find & remove protocol (http, ftp, etc.) and get hostname
                            if (url.indexOf("://") > -1) {
                            hostname = url.split('/')[2];
                            } else {
                            hostname = url.split('/')[0];
                            }
                        
                            // Find & remove port number
                            hostname = hostname.split(':')[0];
                            // Find & remove "?"
                            hostname = hostname.split('?')[0];
                        
                            // Remove "www." if present.
                            hostname = hostname.replace(/^www\./, '');
                        
                            // Split the hostname into parts.
                            const parts = hostname.split('.').reverse();
                        
                            if (parts != null && parts.length > 1) {
                            // Check to see if it has a known second-level domain (SLD) like co.uk, .com.au, etc.
                            // And construct the main domain accordingly
                            if (parts.length > 2 && ['co', 'com', 'org', 'net', 'gov', 'edu'].includes(parts[1])) {
                                // Only join the parts if the second part is a known SLD
                                hostname = `${parts[2]}.${parts[1]}.${parts[0]}`;
                            } else {
                                // For standard domains, join the TLD with the domain name
                                hostname = `${parts[1]}.${parts[0]}`;
                            }
                            }

                            console.log("new domain is " + hostname)
                        
                            return hostname;
                        }
                        

                        function waitForElement(selector, callback) {
                            const intervalTime = 1000; // milliseconds
                            const maxAttempts = 3;
                            let attempts = 0;
                        
                            const interval = setInterval(function () {
                                const element = document.querySelector(selector);
                        
                                if (element) {
                                    clearInterval(interval);
                                    callback(element);
                                } else if (attempts >= maxAttempts) {
                                    clearInterval(interval);
                                    console.error(`Element ${selector} not found after ${maxAttempts} attempts.`);
                                    callback(null, "no domain");
                                }
                        
                                attempts++;
                            }, intervalTime);
                        }
                        
                        waitForElement('.org-company-follow-button', (element) => {
                            if (element) {
                                // Once the element is available, proceed to get the href
                                console.log(element);
                                console.log(element.nextElementSibling);
                                var domainString = element.nextElementSibling?.href;

                                if (domainString === undefined || domainString === null) {
                                    // CLICK ON THE DROPDOWN
                                    var dropdownTrigger = document.querySelectorAll('.artdeco-dropdown__trigger')[1];
                                    if (dropdownTrigger) {
                                        dropdownTrigger.click();

                                            // Function to attempt finding the element
                                            function attemptFindingElement(attempt = 1) {
                                                var dropdownContent = document.querySelector('.artdeco-dropdown__content-inner');
                                                var domainString = null;

                                                if (dropdownContent) {
                                                    var visitWebsiteElement = Array.from(dropdownContent.querySelectorAll('*')).find(el => el.textContent.trim() === 'Visit website');
                                                    if (visitWebsiteElement) {
                                                        domainString = visitWebsiteElement.children[0].href;
                                                        if (domainString) {
                                                            chrome.runtime.sendMessage({ domain: extractMainDomain(domainString) });
                                                            return; // Element found, exit function
                                                        }
                                                    }
                                                }

                                                if (attempt < 5) {
                                                    // If the element is not found, and the attempt count is less than 5, try again after 1 second
                                                    document.querySelectorAll('.artdeco-dropdown__trigger')[1].click();
                                                    setTimeout(() => attemptFindingElement(attempt + 1), 1000);
                                                } else if (!domainString) {
                                                    // If reached maximum attempts and element is not found, send error message
                                                    chrome.runtime.sendMessage({ error: `Visit website link not found after 5 attempts.` });
                                                }
                                            }

                                            // Start the first attempt
                                            attemptFindingElement();


                                    } else {
                                        chrome.runtime.sendMessage({ error: `Dropdown trigger not found.` });
                                    }
                                } else if (domainString) {
                                    chrome.runtime.sendMessage({ domain: extractMainDomain(domainString) });
                                }
                            } else {
                                // Handle the case where "no domain" is returned
                                console.error("No domain found after multiple attempts.");
                                chrome.runtime.sendMessage({ domain: "no domain" });
                            }
                        });
                        
                    }

                    function onDomContentLoaded() {
                        console.log("DOM is ready | showOverlay + extractDomain");
        
                        showOverlay();
                        extractDomainScript();
                    }

                    console.log("JS injected into new tab")

                    if (document.readyState === "complete" || document.readyState === "interactive") {
                        // Call the function directly if the document is already loaded
                        onDomContentLoaded();
                    } else {
                        // Otherwise, wait for the DOMContentLoaded event
                        document.addEventListener('DOMContentLoaded', onDomContentLoaded);
                    }

                },
            }, (injectionResults) => {
                if (chrome.runtime.lastError || !injectionResults || injectionResults.length === 0) {
                    // Handle any errors that occur during script injection
                    sendResponse({ error: true, message: "Failed to extract domain." });
                    chrome.tabs.remove(tab.id); // Close the tab if there's an error
                } else {
                    // If the script was injected successfully, wait for a message from the content script
                    chrome.runtime.onMessage.addListener(function(response, senderResponse) {
                        // Verify that the message is the domain data
                        if (response.domain) {
                            sendResponse({ domainDataBck: response.domain });
                            chrome.tabs.remove(tab.id); // Close the tab after receiving the response
                        } else if (response.error) {
                            sendResponse({ error: true, message: response.error });
                            chrome.tabs.remove(tab.id);
                        }
                    });
                }
            });
        });
        return true; // Indicate that we want to send a response asynchronously
    }
    

    if (message.action === "scrapeDomainS") {
        const profileUrl = message.profileName;

        // Create a new tab in the background to scrape the domain from the company URL
        chrome.tabs.create({ url: profileUrl, active: false }, function (tab) {
            // Once the tab is ready, execute the `extractDomainScript` function
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: extractDomainScriptS
            }, (injectionResults) => {
                if (chrome.runtime.lastError || !injectionResults || injectionResults.length === 0) {
                    // Handle any errors that occur during script injection
                    sendResponse({ error: true, message: "Failed to extract domain." });
                    chrome.tabs.remove(tab.id); // Close the tab if there's an error
                } else {
                    // If the script was injected successfully, wait for a message from the content script
                    chrome.runtime.onMessage.addListener(function(response, senderResponse) {
                        // Verify that the message is the domain data
                        if (response.domain) {
                            sendResponse({ domainDataBck: response.domain });
                            chrome.tabs.remove(tab.id); // Close the tab after receiving the response
                        } else if (response.error) {
                            sendResponse({ error: true, message: response.error });
                            chrome.tabs.remove(tab.id);
                        }
                    });
                }
            });
        });
        return true; // Indicate that we want to send a response asynchronously
    }


    if (message.action === "scrapeSkillsSales") {
        const profileUrl = message.profileName;

        // Create a new tab in the background to scrape the domain from the company URL
        chrome.tabs.create({ url: profileUrl, active: true }, function (tab) {
            // Once the tab is ready, execute the `extractDomainScript` function
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: extractSkillsFromSales
            }, (injectionResults) => {
                if (chrome.runtime.lastError || !injectionResults || injectionResults.length === 0) {
                    // Handle any errors that occur during script injection
                    sendResponse({ error: true, message: "Failed to extract skills." });
                    chrome.tabs.remove(tab.id); // Close the tab if there's an error
                } else {
                    // If the script was injected successfully, wait for a message from the content script
                    chrome.runtime.onMessage.addListener(function(response, senderResponse) {
                        // Verify that the message is the domain data
                        if (response.domain) {
                            sendResponse({ domainDataBck: response.domain });
                            chrome.tabs.remove(tab.id); // Close the tab after receiving the response
                        } else if (response.error) {
                            sendResponse({ error: true, message: response.error });
                            chrome.tabs.remove(tab.id);
                        }
                    });
                }
            });
        });
        return true; // Indicate that we want to send a response asynchronously
    }


});

function extractSkillsFromSales() {

      
      function waitForElement(selector, callback) {
        const intervalTime = 1000; // milliseconds
        const maxAttempts = 5;
        let attempts = 0;
    
        const interval = setInterval(function () {
            const element = document.querySelector(selector);
    
            if (element) {
                clearInterval(interval);
                callback(element);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.error(`Element ${selector} not found after ${maxAttempts} attempts.`);
                callback(null, "no domain");
            }
    
            attempts++;
        }, intervalTime);
    }
    

    waitForElement('#skills-section', (element, domain) => {
        if (element) {
            const skillsHolder = element;
            var skillsList = document.querySelector('.skills-content').children[1].children;

            if(skillsHolder.children.length == 2)
            document.querySelector('#skills-section').children[1].click()

            var skills = [];

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


            if (skillData.length > 0) {
                chrome.runtime.sendMessage({ domain: skills });
            } else {
                chrome.runtime.sendMessage({ error: `Element for skills not found after ${maxAttempts} attempts.` });
            }

        } else {
            // Handle the case where "no domain" is returned
            console.error("No skills found after multiple attempts.");
            chrome.runtime.sendMessage({ domain: "no skills" });
        }
    });
    

}


function extractDomainScriptS() {

    function extractMainDomain(url) {
        let hostname;

        console.log("domain is " + url)
      
        // Find & remove protocol (http, ftp, etc.) and get hostname
        if (url.indexOf("://") > -1) {
          hostname = url.split('/')[2];
        } else {
          hostname = url.split('/')[0];
        }
      
        // Find & remove port number
        hostname = hostname.split(':')[0];
        // Find & remove "?"
        hostname = hostname.split('?')[0];
      
        // Remove "www." if present.
        hostname = hostname.replace(/^www\./, '');
      
        // Split the hostname into parts.
        const parts = hostname.split('.').reverse();
      
        if (parts != null && parts.length > 1) {
          // Check to see if it has a known second-level domain (SLD) like co.uk, .com.au, etc.
          // And construct the main domain accordingly
          if (parts.length > 2 && ['co', 'com', 'org', 'net', 'gov', 'edu'].includes(parts[1])) {
            // Only join the parts if the second part is a known SLD
            hostname = `${parts[2]}.${parts[1]}.${parts[0]}`;
          } else {
            // For standard domains, join the TLD with the domain name
            hostname = `${parts[1]}.${parts[0]}`;
          }
        }

        console.log("new domain is " + hostname)
      
        return hostname;
    }
      
      function waitForElement(selector, callback) {
        const intervalTime = 1000; // milliseconds
        const maxAttempts = 3;
        let attempts = 0;
    
        const interval = setInterval(function () {
            const element = document.querySelector(selector);
    
            if (element) {
                clearInterval(interval);
                callback(element);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.error(`Element ${selector} not found after ${maxAttempts} attempts.`);
                callback(null, "no domain");
            }
    
            attempts++;
        }, intervalTime);
    }
    

    waitForElement('[data-control-name="visit_company_website"]', (element, domain) => {
        if (element) {
            // Once the element is available, proceed to get the href
            console.log(element);
            console.log(element.nextElementSibling);
            var domainString = element?.href;
            if (domainString) {
                chrome.runtime.sendMessage({ domain: extractMainDomain(domainString) });
            } else {
                chrome.runtime.sendMessage({ error: `Element ${selector} not found after ${maxAttempts} attempts.` });
            }
        } else {
            // Handle the case where "no domain" is returned
            console.error("No domain found after multiple attempts.");
            chrome.runtime.sendMessage({ domain: "no domain" });
        }
    });
    

}

  
  

//Skills---------
function scrollToBottomAndCheckLoader(tabId) {
    
    return new Promise(resolve => {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                showOverlay();
                window.scrollBy(0, 5000);
                const delay = Math.floor(Math.random() * 250 + 1550);
                setTimeout(() => {
                    const loader = document.getElementsByClassName('artdeco-loader artdeco-loader--small ember-view');
                    return loader.length > 0;
                }, delay);
            },
            args: []
        }, ([result]) => {
            if (chrome.runtime.lastError) {
                console.error('Error in scrollToBottomAndCheckLoader:', chrome.runtime.lastError);
                resolve(false);
            } else {
                resolve(result?.result || false);
            }
        });
    });
}
function scrapeAndSendData(tabId, sendResponse) {
    console.log('Attempting to scrape data...');
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: scrapeSkillsFromPage,
        args: []
    }, ([result]) => {
        if (chrome.runtime.lastError) {
            console.error('Error in scrapeAndSendData:', chrome.runtime.lastError);
            return;
        }
        const uniqueSkills = [...new Set(result.result)]; // Deduplicate
        chrome.tabs.remove(tabId);
        sendResponse({ skillsData: uniqueSkills });
    });
}
function scrapeSkillsFromPage() {
    const scrapedSkills = [];
    const skillItems = document.querySelectorAll('li.pvs-list__paged-list-item.artdeco-list__item');

    skillItems.forEach(item => {
        const skillNameElement = item.querySelector('a[data-field="skill_page_skill_topic"] span[aria-hidden="true"]');
        var skillEndorsementCount = '0';

        if (item.querySelector('li-icon[type="people"]') != null)
            skillEndorsementCount = item.querySelector('li-icon[type="people"]').parentElement.parentElement.parentElement.parentElement.nextElementSibling.innerText.split('\n')[0].split(' ')[0]

        const skillName = skillNameElement ? skillNameElement.textContent.trim() : null;

        if (skillName) {
            // Check if skillName already exists in scrapedSkills
            const existingSkill = scrapedSkills.find(skill => skill.skill === skillName);

            if (existingSkill) {
                // If skillName already exists, update the endorsementCount
            } else {
                // If skillName doesn't exist, push a new object
                scrapedSkills.push({
                    skill: skillName,
                    endorsementCount: skillEndorsementCount
                });
            }
        }
    });

    return scrapedSkills;
}


//Certifications-------
function scrapeAndSendCertificationsData(tabId, sendResponse) {
    console.log('Attempting to scrape certifications data...');
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: scrapeLicensesAndCertificationsFromPage,
        args: []
    }, ([result]) => {
        if (chrome.runtime.lastError) {
            console.error('Error in scrapeAndSendCertificationsData:', chrome.runtime.lastError);
            return;
        }
        chrome.tabs.remove(tabId);
        sendResponse({ certData: result.result });
    });
}

function scrapeLicensesAndCertificationsFromPage() {
    console.log("Entered the ex function")
    const scrapedCertifications = [];
    const certificationItems = document.querySelectorAll('li.pvs-list__paged-list-item.artdeco-list__item');
    console.log(certificationItems)
    certificationItems.forEach(item => {
        const certificationNameElement = item.children[0].children[0].children[1].children[0].children[0].children[0];
        const issuingOrganizationElement = item.querySelector('span.t-14.t-normal span[aria-hidden="true"]');
        const dateIssuedElement = item.querySelector('span.t-14.t-normal.t-black--light span[aria-hidden="true"]');
        const certID = item.getElementsByClassName('t-14 t-normal t-black--light')[1];
        
        const certificationName = certificationNameElement ? certificationNameElement.innerText.split('\n')[0] : null;
        const issuingOrganization = issuingOrganizationElement ? issuingOrganizationElement.textContent.trim() : null;
        var dateIssued = dateIssuedElement ? dateIssuedElement.textContent.trim() : null;
        const certificationID = certID ? certID.innerText.split('\n')[0] : null;

        if(dateIssued.includes('Credential ID')){
            dateIssued = null;
        }

        scrapedCertifications.push({certificationName, issuingOrganization, dateIssued, certificationID});
        
    });
    return scrapedCertifications;
}


//Experience------------
function scrapeExperienceFromPage() {
    const experiences = [];

    const experienceItems = document.querySelectorAll('li.pvs-list__paged-list-item.artdeco-list__item.pvs-list__item--line-separated.pvs-list__item--one-column');
    experienceItems.forEach(item => {
        let jobTitle = null, companyName = null, rawDate = null, date = null, location = null, description = null;



        //Check number of nested sections
        if (item.querySelectorAll('.pvs-list__paged-list-item  .pvs-list__item--one-column').length == 0) {
            // Use logic for the regular structure

            jobTitle = item.children[0].children[0].children[1].children[0].children[0].children[0].innerText.split('\n')[0];
            companyName = fetchTextContentWithin(item, 'span.t-14.t-normal span[aria-hidden="true"]');
            rawDate = fetchTextContentWithin(item, 'span.t-14.t-normal.t-black--light:nth-child(3) span[aria-hidden="true"]');
            date = rawDate ? rawDate.split('·')[0].trim() : null;  // This line checks if rawDate is null before trying to split it
            location = fetchTextContentWithin(item, 'span.t-14.t-normal.t-black--light:nth-child(4) span[aria-hidden="true"]');

            const descriptionElements = item.getElementsByClassName('display-flex align-items-center t-14 t-normal t-black');
            description = "";
            if (descriptionElements.length > 0) {
                for (let i = 0; i < descriptionElements.length; i++) {
                    if (!descriptionElements[i].getElementsByClassName('visually-hidden')[0].innerText.includes("Skills:")) {
                        description = descriptionElements[i].getElementsByClassName('visually-hidden')[0].innerText.trim();
                    }
                }
            }

            experiences.push({
                jobTitle,
                companyName,
                date,
                location,
                description
            });

        } else {
            // Use logic for NESTED structure

            const nestedExperiences = item.querySelectorAll('.pvs-list__paged-list-item  .pvs-list__item--one-column');
            nestedExperiences.forEach(exp => {

            jobTitle = exp.getElementsByClassName('display-flex flex-row justify-space-between')[0].children[0].children[0].innerText.split('\n')[0];
            companyName = item.getElementsByClassName('optional-action-target-wrapper display-flex flex-column full-width')[0].children[0].innerText.split('\n')[0];

            if(exp.getElementsByClassName('display-flex align-items-center t-14 t-normal t-black')[0] != undefined)
            description =  exp.getElementsByClassName('display-flex align-items-center t-14 t-normal t-black')[0].innerHTML.trim()

            var elements = exp.querySelectorAll('.t-14.t-normal.t-black--light');
            for (var i = 0; i < elements.length; i++) {
                if (elements[i].innerText.includes(' - ') && elements[i].innerText.includes(' · ')) {
                    date = elements[i].innerText.split('\n')[0].split('·')[0];
                }else{
                    location = elements[i].innerText.split('\n')[0];
                }
            }


            experiences.push({
                    jobTitle,
                    companyName,
                    date,
                    location,
                    description
                });
            });
        }

    });

    
    return experiences;
}
function scrapeAndSendExperienceData(tabId, sendResponse) {
    console.log('Attempting to scrape experience data...');
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: scrapeExperienceFromPage,
        args: []
    }, ([result]) => {
        if (chrome.runtime.lastError) {
            console.error('Error in scrapeAndSendExperienceData:', chrome.runtime.lastError);
            return;
        }
        chrome.tabs.remove(tabId);
        sendResponse({ experienceData: result.result });
    });
}


//Education------------ 2/1/25/IG-Begin
function scrapeEducationFromPage() {
    const educations = [];

const educationItems = document.querySelectorAll('li.pvs-list__paged-list-item.artdeco-list__item.pvs-list__item--line-separated.pvs-list__item--one-column');

educationItems.forEach(item => {
  let schoolName = null, degreeAndField = null, dateRange = null, description = null;

  // Find the details holder using a more robust selector
  const detailsHolder = item.querySelector('a.optional-action-target-wrapper.display-flex.flex-column.full-width');

  if (detailsHolder) {
    // Extract school name
    const schoolNameElement = detailsHolder.querySelector('div.display-flex.flex-wrap.align-items-center.full-height');
    schoolName = schoolNameElement ? schoolNameElement.innerText.split('\n')[0] : null;

    // Extract degree and field
    const degreeAndFieldElement = detailsHolder.querySelector('span.t-14.t-normal');
    degreeAndField = degreeAndFieldElement ? degreeAndFieldElement.innerText.split('\n')[0] : null;

    // Extract date range
    const dateRangeElement = detailsHolder.querySelector('span.t-14.t-normal.t-black--light');
    dateRange = dateRangeElement ? dateRangeElement.innerText.split('\n')[0] : null;

    // Extract description
    const descriptionElements = item.querySelectorAll('.display-flex.align-items-center.t-14.t-normal.t-black');
    description = "";
    descriptionElements.forEach(descElement => {
      const visuallyHiddenElement = descElement.querySelector('.visually-hidden');
      if (visuallyHiddenElement) {
        const elementText = visuallyHiddenElement.innerText.trim();
        if (!elementText.includes("Skills:")) {
          if (!description.includes(elementText)) {
            description += elementText + " ";
          }
        }
      }
    });
  }

  educations.push({
    schoolName,
    degreeAndField,
    dateRange,
    description: description.trim()
  });
});

    return educations;
}
//Education------------ 2/1/25/IG-End

function scrapeAndSendEducationData(tabId, sendResponse) {
    console.log('Attempting to scrape education data...');
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: scrapeEducationFromPage,
        args: []
    }, ([result]) => {
        if (chrome.runtime.lastError) {
            console.error('Error in scrapeAndSendEducationData:', chrome.runtime.lastError);
            return;
        }
        chrome.tabs.remove(tabId);
        sendResponse({ educationData: result.result });
    });
}





//Helper----------------------------------------
function fetchTextContentWithin(parentElement, selector) {
    const element = parentElement.querySelector(selector);
    return element ? element.textContent.trim() : null;
}



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

