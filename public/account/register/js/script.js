if (/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(localStorage['uuid'])) window.location.href = '/account';

const submitButton = document.getElementById('submit');
const infoText = document.getElementById('info');
const username = document.getElementById('username');
const password = document.getElementById('password');

const Messages = {
    registerSuccess: 'Registration successful, you may now access the <a href="/account/">account</a> page.<br>Here is your UUID: <br>',
    registerFail: 'Registration failed due to an invalid request. Please try again later or reload the page.',
    invalidUsername: 'Your username is invalid. Please try again.',
    usernameTaken: 'That username is already taken. Please try another one.'
}

submitButton.addEventListener('click', async(e) => {
    if (e.isTrusted) {
        if (!/^[a-z0-9_-]{3,15}$/.test(username.value)) return infoText.innerText = Messages.invalidUsername;

        fetch(`/api/account/register?username=${username.value}&password=${password.value}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
            }
        }).then(res => {
            switch (res.status) {
                case 200:
                    res.text().then(text => {
                        localStorage.setItem('uuid', text);
                        infoText.innerHTML = Messages.registerSuccess + `<font color="green">${text}</font>`;
                    });
                    break;
                case 400:
                    infoText.innerText = Messages.registerFail;
                    break;
                case 409:
                    infoText.innerText = Messages.usernameTaken;
                    break;
                default:
                    infoText.innerText = 'An unknown error occured. Please try again later or reload the page.';
                    break;
            }
        }).catch(console.error);
    } else if (e.isTrusted === false) {
        return console.error("What are you trying to do?");
    }
});