if (/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(localStorage['uuid'])) window.location.href = '/account';

const submitButton = document.getElementById('submit');
const infoText = document.getElementById('info');
const username = document.getElementById('username');
const uuid = document.getElementById('uuid');

const Messages = {
    loginSuccess: 'Login successful. Redirecting...',
    loginFail: 'Login failed due to an invalid request. Please try again later or reload the page.',
    invalidUsername: 'You need to enter a valid Username to login. Please try again.',
    invalidDetails: 'Your Username or UUID is invalid. Please try again.',
    notLoggedIn: 'You need to login before accessing that page.',
    rateLimited: 'You are sending too many requests, please try again later.'
}
if (getParameterByName('unauthorized') === '') infoText.innerText = Messages.notLoggedIn;

submitButton.addEventListener('click', async(e) => {
    if (e.isTrusted) {
        if (!/^[a-z0-9_-]{3,15}$/.test(username.value)) return infoText.innerText = Messages.invalidUsername;

        fetch(`/api/account/login?username=${username.value}&uuid=${uuid.value}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
            }
        }).then(res => {
            switch (res.status) {
                case 204:
                    localStorage.setItem('uuid', uuid.value);
                    infoText.innerText = Messages.loginSuccess;
                    setTimeout(() => window.location.href = '/account', 1000);
                    break;
                case 400:
                    infoText.innerText = Messages.loginFail;
                    break;
                case 401:
                    infoText.innerText = Messages.invalidDetails;
                    break;
                case 429:
                    infoText.innerText = Messages.rateLimited;
                default:
                    infoText.innerText = 'An unknown error occured. Please try again later or reload the page.';
                    break;
            }
        }).catch(console.error);
    } else if (e.isTrusted === false) {
        return console.error("What are you trying to do?");
    }
});

// https://stackoverflow.com/a/901144
function getParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}