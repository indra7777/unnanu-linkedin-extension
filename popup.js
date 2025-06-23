let profilesCollected = 0;
let stoppingInProgress = false;
var endpointType = 'prod'   //uat or prod
var APIstring = 'https://plugin.unnanu.com';


//Single profile button
document.addEventListener('DOMContentLoaded', function() {
    var singleProfile_BTN = document.getElementById('scrapeProfile');
    singleProfile_BTN.addEventListener('click', ScanCurrentProfile);

    var scrapeButton = document.getElementById('scrapeApplicants');
    scrapeButton.addEventListener('click', ScrapeApplicants);

    var scrapePButton = document.getElementById('scrapeProjects');
    scrapePButton.addEventListener('click', ScrapeProjects);

    var scrapeSales = document.getElementById('scrapeSales');
    scrapeSales.addEventListener('click', ScrapeSales);

    var refreshButton = document.getElementById('refreshButton');
    refreshButton.addEventListener('click', RefreshAll);

    //var stopAllExtract = document.getElementById('stopAllScrapeButton');
    //stopAllExtract.addEventListener('click', StopAllExtracting);

    var logoutButton = document.getElementById('logoutButton');
    logoutButton.addEventListener('click', function() {
        logoutUser();
    });

    chrome.storage.local.get('isRunning', function(data) {
        let isScraping = data.isRunning || false;
        updateButtonState(isScraping);
    });

    chrome.storage.local.get('isRunningP', function(data) {
        let isScraping = data.isRunningP || false;
        updateButtonStateP(isScraping);
    });

    chrome.storage.local.get('isRunningS', function(data) {
        let isScraping = data.isRunningS || false;
        updateButtonStateS(isScraping);
    });


    chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
        if (tabs[0] && tabs[0].url) {
            setButtonStateForUrl(tabs[0].url);
        }
    });

    getUnnanuData(function(userData) {

        console.log(userData)
        console.log(userData.type)

        if (userData && userData.type === "profile") {
            checkIfProfileScrapedBefore(userData.id);
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {message: "checkForElement"}, function(response) {
                    if (response && response.elementFound) {
                        // The button was found, enable the "Scrape current profile" button:
                        enableProfileScrapeButton();
                    } else {
                        // The button was not found, disable the "Scrape current profile" button:
                        disableProfileScrapeButton();
                    }
                });
            });
        }

        if (userData && userData.type === "hire") {
            console.log
            checkIfProfileScrapedBefore(userData.id);
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {message: "checkForElement"}, function(response) {
                    if (response && response.elementFound) {
                        disableProfileScrapeButton();
                    } else {
                       // enableProfileScrapeButton();
                    }
                });
            });
        }



    });

    checkCurrentUrlAndDisableButton();

    chrome.storage.local.get('profilesCollected', function(data) {
        if (data.profilesCollected !== undefined) {
            profilesCollected = data.profilesCollected;
            let countSpan = document.getElementById('collected-profiles-count');
            countSpan.textContent = `Profiles collected: ${profilesCollected}`;
        }
    });

    chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
        let currentUrl = tabs[0].url;
        adjustScrapeProfileButtonForUrl(currentUrl);
    });


});

function checkIfProfileScrapedBefore(currentProfileId, callback) {
    chrome.storage.local.get('sentProfileIds', function(data) {
        const profileIds = data.sentProfileIds || [];
        let isScraped = profileIds.includes(currentProfileId);
        if (isScraped) {
            disableProfileScrapeButton();
        }
        if (callback) {
            callback(isScraped);
        }
    });
}

function RefreshAll(){
    chrome.tabs.query({}, function(tabs) {
        for (let tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { message: "refreshAll" });
        }
    });    
}


document.addEventListener('DOMContentLoaded', function() {
    const hireRadio = document.getElementById('hireRadio');
    const profileRadio = document.getElementById('profileRadio');
    const signupLink = document.getElementById('signupLink');

    signupLink.addEventListener('click', function(e) {
        e.preventDefault();
        chrome.tabs.create({ url: this.getAttribute('href') });
    });

    function updateSignupLink() {
        if (hireRadio.checked) {
            signupLink.href = "https://hire.unnanu.com/pricing";
        } else if (profileRadio.checked) {
            signupLink.href = "https://talent.unnanu.com";
        }
    }

    hireRadio.addEventListener('change', updateSignupLink);
    profileRadio.addEventListener('change', updateSignupLink);

    // Set the initial link when the page loads
    updateSignupLink();
});

function logoutUser() {
    chrome.storage.local.set({ 'isLoggedOut': true }, function() {  // set isLoggedOut flag
        chrome.storage.local.remove(['unnanu_token', 'unnanu_id', 'unnanu_expiry', 'unnanu_type'], function() {

            $('.main-container').hide();
            $('.login-container').show();

            let errorMessage = document.getElementById('error-message');
            errorMessage.textContent = "You have logged out.";
            errorMessage.classList.add('error-visible');
        });
    });
}


function enableProfileScrapeButton() {
    getUnnanuData(function(userData) {
        if (userData && userData.id) {
            checkIfProfileScrapedBefore(userData.id, function(isScraped) {
                if (!isScraped) {  // Only enable if it's not scraped before
                    let scrapeProfileBtn = document.getElementById('scrapeProfile');
                    scrapeProfileBtn.disabled = false;
                    scrapeProfileBtn.style.backgroundColor = "#266adc";  // Restoring the original color
                }
            });
        }
    });
}

function checkCurrentUrlAndDisableButton() {
    // Get the current URL
    chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
        let currentUrl = tabs[0].url;
        
        // Check if the URL is in the sentProfileIds list
        chrome.storage.local.get('sentProfileIds', function(data) {
            const profileIds = data.sentProfileIds || [];
            console.log("DOES ")
            console.log(profileIds)
            console.log("INCLUDE " + currentUrl)
            let isScraped = profileIds.includes(currentUrl);
            if (isScraped) {
                disableProfileScrapeButton();
            }
        });
    });
}



function disableProfileScrapeButton() {
    let scrapeProfileBtn = document.getElementById('scrapeProfile');
    scrapeProfileBtn.disabled = true;
    scrapeProfileBtn.style.backgroundColor = "#d3d3d3";  // Grey color to indicate it's disabled
}

function StopAllExtracting(){
    stoppingInProgress = true;
    updateStoppingState();
    updateStoppingStateP();
    updateStoppingStateS();

    chrome.tabs.query({}, function(tabs) {
        for (let tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { message: "stopScraping" });
            chrome.tabs.sendMessage(tab.id, { message: "stopScrapingP" });
            chrome.tabs.sendMessage(tab.id, { message: "stopScrapingS" });
        }
    }); 

    document.querySelector('.textHolder').style.display = 'none';
    
}


function StopScrapingAll(){
    // Update the button immediately
    stoppingInProgress = true;
    updateStoppingState();

    // Send the stop message to all tabs
    chrome.tabs.query({}, function(tabs) {
        for (let tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { message: "stopScraping" });
        }
    });    
}

function StopScrapingAllP(){
    // Update the button immediately
    stoppingInProgress = true;
    updateStoppingStateP();

    // Send the stop message to all tabs
    chrome.tabs.query({}, function(tabs) {
        for (let tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { message: "stopScrapingP" });
        }
    });    
}

function StopScrapingAllS(){
    // Update the button immediately
    stoppingInProgress = true;
    updateStoppingStateS();

    // Send the stop message to all tabs
    chrome.tabs.query({}, function(tabs) {
        for (let tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { message: "stopScrapingS" });
        }
    });    
}


function ScanCurrentProfile() {
    // Show the loader and hide the button's text
    document.getElementById('scrapeProfileLoader').style.display = 'inline-block';
    document.getElementById('scrapeProfileText').style.display = 'none';

    chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
        var activeTab = tabs[0];

        chrome.tabs.sendMessage(activeTab.id, { "message": "scrapeCurrent" }, function(response) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message); //message port was closed before a response was recieved
            } else if (!response.success) {
                console.error(response.message);
            }
        });
        
    });

    
}


function ScrapeApplicants() {
    var textHolder = document.querySelector('.textHolder');

    chrome.storage.local.get('isRunning', function(data) {
        const isScraping = data.isRunning || false;

        chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
            var activeTab = tabs[0];
            
            if (isScraping) {
                // If scraping is already ongoing, stop it
                StopScrapingAll();
                chrome.tabs.sendMessage(activeTab.id, { message: "stopScraping" });
                textHolder.style.display = 'none';
            } else {
                textHolder.style.display = 'block'; 
                profilesCollected = 0;
                chrome.storage.local.set({'profilesCollected': profilesCollected});

                // Resetting stopInitiated before starting scraping
                chrome.storage.local.set({ 'stopInitiated': false }, function() {
                    // Then, start the scraping process
                    chrome.tabs.sendMessage(activeTab.id, { "message": "scrapeApps" });
                    // Store the tabId of the active tab where scraping was started
                    chrome.storage.local.set({ 'scrapingTabId': activeTab.id });
                });
            }
        });
    });

    
}


function ScrapeProjects() {
    var textHolder = document.querySelector('.textHolder');

    chrome.storage.local.get('isRunningP', function(data) {
        const isScraping = data.isRunningP || false;

        chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
            var activeTab = tabs[0];
            
            if (isScraping) {
                // If scraping is already ongoing, stop it
                StopScrapingAllP();
                chrome.tabs.sendMessage(activeTab.id, { message: "stopScrapingP" });
                textHolder.style.display = 'none';
            } else {
                 textHolder.style.display = 'block'; 
                profilesCollected = 0;
                chrome.storage.local.set({'profilesCollectedP': profilesCollected});

                // Resetting stopInitiated before starting scraping
                chrome.storage.local.set({ 'stopInitiatedP': false }, function() {
                    // Then, start the scraping process
                    console.log("Send start message")
                    chrome.tabs.sendMessage(activeTab.id, { "message": "scrapeProjects" });
                    // Store the tabId of the active tab where scraping was started
                    chrome.storage.local.set({ 'scrapingTabIdP': activeTab.id });
                });
            }
        });
    });

    
}

function ScrapeSales() {
    var textHolder = document.querySelector('.textHolder');

    chrome.storage.local.get('isRunningS', function(data) {
        const isScraping = data.isRunningS || false;

        chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
            var activeTab = tabs[0];
            
            if (isScraping) {
                // If scraping is already ongoing, stop it
                StopScrapingAllS();
                chrome.tabs.sendMessage(activeTab.id, { message: "stopScrapingS" });
                textHolder.style.display = 'none';
            } else {
                textHolder.style.display = 'block'; 
                profilesCollected = 0;
                chrome.storage.local.set({'profilesCollectedS': profilesCollected});

                // Resetting stopInitiated before starting scraping
                chrome.storage.local.set({ 'stopInitiatedS': false }, function() {
                    // Then, start the scraping process
                    console.log("Send start message SALES")
                    chrome.tabs.sendMessage(activeTab.id, { "message": "scrapeSales" });
                    // Store the tabId of the active tab where scraping was started
                    chrome.storage.local.set({ 'scrapingTabIdS': activeTab.id });
                });
            }
        });
    });

    
}


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    if (request.action === "scrapingStarted") {
        updateButtonState(true);
    }

    if (request.action === "scrapingStartedP") {
        updateButtonStateP(true);
    }

    if (request.action === "scrapingStartedS") {
        updateButtonStateS(true);
    }
    
    if (request.action === "tabClosingOrRefreshing") {
        updateButtonState(false);
    }

    if(request.action === "scrapingStopped"){
        updateButtonState(false);
    }

    if(request.action === "scrapingStoppedP"){
        updateButtonStateP(false);
    }

    if(request.action === "scrapingStoppedS"){
        updateButtonStateS(false);
    }

    if(request.action === "scrapingFullyStopped") {
        stoppingInProgress = false;
        updateButtonState(false);
    }

    if(request.action === "scrapingFullyStoppedP") {
        stoppingInProgress = false;
        updateButtonStateP(false);
    }

    if(request.action === "scrapingFullyStoppedS") {
        stoppingInProgress = false;
        updateButtonStateS(false);
    }


    if (request.action === "restoreScrapeProfileButtonState") {
        // Hide the loader and show the button's text
        document.getElementById('scrapeProfileLoader').style.display = 'none';
        document.getElementById('scrapeProfileText').style.display = 'inline';
    }

    if(request.action === "updateTheCount"){
        chrome.storage.local.get('profilesCollected', function(data) {
            if (data.profilesCollected !== undefined) {
                profilesCollected = data.profilesCollected;
                let countSpan = document.getElementById('collected-profiles-count');
                countSpan.textContent = `Profiles collected: ${profilesCollected}`;
            }
        });
    }

    if(request.action === "updateTheCountP"){
        chrome.storage.local.get('profilesCollectedP', function(data) {
            if (data.profilesCollectedP !== undefined) {
                profilesCollectedP = data.profilesCollectedP;
                let countSpan = document.getElementById('collected-profiles-count');
                countSpan.textContent = `Profiles collected: ${profilesCollectedP}`;
            }
        });
    }
    
});


function updateStoppingState() {
    let scrapeApplicants = document.getElementById('scrapeApplicants');
    scrapeApplicants.innerText = "Stopping...";
    scrapeApplicants.style.backgroundColor = "#e8c525"; // Yellow color, you can adjust this to your preference
}


function updateStoppingStateP() {
    let scrapeApplicants = document.getElementById('scrapeProjects');
    scrapeApplicants.innerText = "Stopping...";
    scrapeApplicants.style.backgroundColor = "#e8c525"; // Yellow color, you can adjust this to your preference
}

function updateStoppingStateS() {
    let scrapeApplicants = document.getElementById('scrapeSales');
    scrapeApplicants.innerText = "Stopping...";
    scrapeApplicants.style.backgroundColor = "#e8c525"; // Yellow color, you can adjust this to your preference
}
  

//LOGIN-----------------------------------------

$(document).ready(function() {

       // First, check if the user had logged out
       chrome.storage.local.get('isLoggedOut', function(data) {
        if(data.isLoggedOut) {
            $('.main-container').hide();
            $('.login-container').show();
        } else {
            // If user hasn't logged out, then check for auto-login
            getUnnanuData(function(data) {
                if (data) {
                    $('.login-container').hide();
                    $('.main-container').show();
                } else {
                    $('.main-container').hide();
                    $('.login-container').show();
                }
            });
        }
    });

    $('.login-button').off('click').on('click', function() {
        let email = $('#emailInput').val();
        let password = $('#passwordInput').val();
        let selectedRadio = $("input[name='loginType']:checked").val();
        
        let endpoint = selectedRadio === 'hire' 
        ? APIstring + '/api/v1/user/hire/signin?endpointType=' + endpointType
        : APIstring + '/api/v1/user/profile/signin?endpointType=' + endpointType;
    
    
        let data = {
            Email: email,
            Password: CryptoJS.MD5(password).toString()  // Using CryptoJS to hash the password
        };
        
        // Disable the button and show the loader
        $('.login-button').prop('disabled', true);
        $('.loader').css('display', 'inline-block');  // Show the spinner
        $('#login-text').hide();  // Hide the "Login" text
        
        $.ajax({
            url: endpoint,
            type: 'POST',
            data: JSON.stringify(data),  // Convert the data to a JSON string
            contentType: 'application/json',  // Set the content type to JSON
            complete: function(response) {
                // Enable the button and hide the loader
                $('.login-button').prop('disabled', false);
                $('.loader').hide();  // Hide the spinner
                $('#login-text').show();  // Show the "Login" text
    
                const responseData = response.responseJSON;
                console.log('responseData IS ')
                console.log(responseData)
                if (responseData && responseData.Code === 200) {
                    const currentTime = new Date().getTime();
                    const expiryTime = currentTime + 60 * 60 * 1000;  // 30 minutes in milliseconds

                
                    chrome.storage.local.set({
                        'unnanu_token': responseData.Data.Token,
                        'unnanu_id': responseData.Data.UserId,
                        'unnanu_expiry': expiryTime,
                        'unnanu_type': selectedRadio,
                        'isLoggedOut': false 
                    }, function() {
                        adjustInterfaceForUserType(selectedRadio);
                    });
                    
                    $('.login-container').hide();
                    $('.main-container').show();
                    $('#error-message').removeClass('error-visible');

                    getUnnanuData(function(userData) {

                        console.log(userData)
                        console.log(userData.type)
                
                        if (userData && userData.type === "profile") {
                            checkIfProfileScrapedBefore(userData.id);
                            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                                chrome.tabs.sendMessage(tabs[0].id, {message: "checkForElement"}, function(response) {
                                    if (response && response.elementFound) {
                                        // The button was found, enable the "Scrape current profile" button:
                                        enableProfileScrapeButton();
                                    } else {
                                        // The button was not found, disable the "Scrape current profile" button:
                                        disableProfileScrapeButton();
                                    }
                                });
                            });
                        }
                
                        if (userData && userData.type === "hire") {
                            console.log
                            checkIfProfileScrapedBefore(userData.id);
                            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                                chrome.tabs.sendMessage(tabs[0].id, {message: "checkForElement"}, function(response) {
                                    if (response && response.elementFound) {
                                        disableProfileScrapeButton();
                                    } else {
                                       // enableProfileScrapeButton();
                                    }
                                });
                            });
                        }
                
                
                
                    });

                } else {
                    $('#error-message').text("Failed to authenticate user, user is incorrect.").addClass('error-visible');
                }
            },
            error: function(err) {
                // This handles the 400 case
                const responseData = err.responseJSON;
                if (responseData && responseData.Code === 200) {
                    // This is a "successful" 400, handle it as if it were a success.
                    const currentTime = new Date().getTime();
                    const expiryTime = currentTime + 60 * 60 * 1000;  // 30 minutes in milliseconds

                
                    chrome.storage.local.set({
                        'unnanu_token': responseData.Data.Token,
                        'unnanu_id': responseData.Data.UserId,
                        'unnanu_expiry': expiryTime,
                        'unnanu_type': selectedRadio,
                        'isLoggedOut': false 
                    }, function() {
                        adjustInterfaceForUserType(selectedRadio);
                    });
                    
                    $('.login-container').hide();
                    $('.main-container').show();
                    $('#error-message').removeClass('error-visible');
                } else {
                    // This is a genuine error, handle it as an error.
                    $('.login-button').prop('disabled', false);
                    $('.loader').hide();
                    $('#login-text').show();  // Show the "Login" text
                    $('#error-message').text("Failed to authenticate user, user is incorrect.").addClass('error-visible');
                }
            }
        });
    });    
    
});

function getUserData(callback) {
    getUnnanuData(function(unnanuData) {
        if (unnanuData && unnanuData.id) {
            const hireSelection = document.getElementById('hireRadio').checked;
            const selection = hireSelection ? 1 : 0; // 1 for hire and 0 for profile
            callback({
                id: unnanuData.id,
                selection: selection
            });
        } else {
            callback(null);
        }
    });
}


function getUnnanuData(callback) {
    chrome.storage.local.get(['unnanu_token', 'unnanu_id', 'unnanu_expiry', 'unnanu_type'], function(result) {
        const currentTime = new Date().getTime();
        if (result.unnanu_expiry && currentTime > result.unnanu_expiry) {
            //console.log("Unnanu data is expired.");
            chrome.storage.local.remove(['unnanu_token', 'unnanu_id', 'unnanu_expiry', 'unnanu_type']);  // Clearing the expired data
            expireUser();  // Logging out the user
            callback(null);
        } else if (result.unnanu_token && result.unnanu_id) {
            //console.log("Unnanu data fetched successfully.");
            adjustInterfaceForUserType(result.unnanu_type);
            callback({
                token: result.unnanu_token,
                id: result.unnanu_id,
                type: result.unnanu_type
            });
        } else {
            //console.log("Required Unnanu data (token or ID) is missing.");
            callback(null);
        }
    });
}


function isLinkedInProfile(url) {
    return url && url.startsWith('https://www.linkedin.com/in/');
}

function isLinkedOnProjects(url) {
    return url && url.startsWith('https://www.linkedin.com/talent/hire/');
}

function isLinkedOnSales(url) {

    if(url.startsWith('https://www.linkedin.com/sales/search/people?query='))
    return false;

    if(url.startsWith('https://www.linkedin.com/sales/search/people?viewAllFilters=true'))
    return false;

    if(url == 'https://www.linkedin.com/sales/search/people')
    return false;

    return url && (url.startsWith('https://www.linkedin.com/sales/search/people') || url.startsWith('https://www.linkedin.com/sales/lists/people/'));
}



var shouldBeGrey;
var shouldBeGreyP;
var shouldBeGreyS;
function setButtonStateForUrl(url) {
    let scrapeApplicantsBtn = document.getElementById('scrapeApplicants');
    let scrapeProjectsBtn = document.getElementById('scrapeProjects');
    let scrapeSalesBtn = document.getElementById('scrapeSales');
    
    const hiringUrlPattern = /^https:\/\/www\.linkedin\.com\/hiring\/jobs\/\d+\/applicants\/\d+\/detail\//;
    if (isLinkedInProfile(url) || hiringUrlPattern.test(url) == false) {
        shouldBeGrey = true;
        scrapeApplicantsBtn.disabled = true;
        scrapeApplicantsBtn.style.backgroundColor = "#d3d3d3";  // Grey color
        scrapeApplicantsBtn.innerText = "Extract Job Applicants";

    } else if (hiringUrlPattern.test(url)) {
        shouldBeGrey = false;
        scrapeApplicantsBtn.disabled = false;
        scrapeApplicantsBtn.style.backgroundColor = "#266adc";
        scrapeApplicantsBtn.innerText = "Extract Job Applicants";
    }

    if(isLinkedOnProjects(url) == false){
        shouldBeGreyP = true;
        scrapeProjectsBtn.disabled = true;
        scrapeProjectsBtn.style.backgroundColor = "#d3d3d3";  // Grey color
        scrapeProjectsBtn.innerText = "Extract Recruiter Applicants";
    }else{
        shouldBeGreyP = true;
        scrapeProjectsBtn.disabled = false;
        scrapeProjectsBtn.style.backgroundColor = "#266adc";
        scrapeProjectsBtn.innerText = "Extract Recruiter Applicants";
    }

    if(isLinkedOnSales(url) == false){
        shouldBeGreyS = true;
        scrapeSalesBtn.disabled = true;
        scrapeSalesBtn.style.backgroundColor = "#d3d3d3";  // Grey color
        scrapeSalesBtn.innerText = "Extract SN List Profiles";
    }else{
        shouldBeGreyS = true;
        scrapeSalesBtn.disabled = false;
        scrapeSalesBtn.style.backgroundColor = "#266adc";
        scrapeSalesBtn.innerText = "Extract SN List Profiles";
    }
}





function expireUser() {
    $('.main-container').hide();
    $('.login-container').show();
    $('#error-message').text("Session expired. Please log in again.").addClass('error-visible');
}

function updateButtonState(isScraping) {
    var textHolder = document.querySelector('.textHolder');
    if(stoppingInProgress) return;

    console.log("UPDATE TO " + isScraping)
    
    let scrapeApplicants = document.getElementById('scrapeApplicants');
    if (isScraping) {
        scrapeApplicants.innerText = "STOP Extracting In Progress......";
        scrapeApplicants.disabled = false;
        scrapeApplicants.style.backgroundColor = "#d15050";
        textHolder.style.display = "block";
    } else {
        if(shouldBeGrey == false){
            scrapeApplicants.innerText = "Extract Job Applicants";
            scrapeApplicants.style.backgroundColor = "#266adc";
        }
        textHolder.style.display = "none";
    }
}

function updateButtonStateP(isScraping) {
    var textHolder = document.querySelector('.textHolder');
    if(stoppingInProgress) return;
    
    let scrapeApplicants = document.getElementById('scrapeProjects');
    if (isScraping) {
        scrapeApplicants.innerText = "STOP Extracting In Progress......";
        scrapeApplicants.disabled = false;
        scrapeApplicants.style.backgroundColor = "#d15050";
        textHolder.style.display = "block";
    } else {
        if(shouldBeGreyP == false){
            scrapeApplicants.innerText = "Extract Recruiter Applicants";
            scrapeApplicants.style.backgroundColor = "#266adc";
        }
        textHolder.style.display = "none";
    }
}

function updateButtonStateS(isScraping) {
    var textHolder = document.querySelector('.textHolder');
    if(stoppingInProgress) return;
    
    let scrapeApplicants = document.getElementById('scrapeSales');
    if (isScraping) {
        scrapeApplicants.innerText = "STOP Extracting In Progress......";
        scrapeApplicants.disabled = false;
        scrapeApplicants.style.backgroundColor = "#d15050";
        textHolder.style.display = "block";
    } else {
        if(shouldBeGreyS == false){
            scrapeApplicants.innerText = "Extract SN List Profiles";
            scrapeApplicants.style.backgroundColor = "#266adc";
        }
        textHolder.style.display = "none";
    }
}

function adjustInterfaceForUserType(type) {
    if(type === "profile") {
        // Hide the "scrapeApplicants" button for talents.
        $('.hire-action').hide();
    } else {
        $('.hire-action').show();
    }
}


function adjustScrapeProfileButtonForUrl(url) {
    let scrapeProfileBtn = document.getElementById('scrapeProfile');
    if (isLinkedInProfile(url)) {
        scrapeProfileBtn.disabled = false;
        scrapeProfileBtn.style.backgroundColor = "#266adc";  // Restoring the original color
    } else {
        scrapeProfileBtn.disabled = true;
        scrapeProfileBtn.style.backgroundColor = "#d3d3d3";  // Grey color to indicate it's disabled
        console.log("DISABLE CURRENT")
    }
}




