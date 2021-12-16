const uuid = localStorage['uuid'];
const username = document.getElementById('username');
const password = document.getElementById('password');
const qrcode = document.getElementById('qr-code');
const logout = document.getElementById('logout');
const popup = document.getElementById('popup');
const errorMsg = document.getElementById('errorMsg');
const closeBtn = document.getElementById('closeBtn');

fetch('/api/account/details', {
    method: 'GET',
    headers: {
        'Content-Type': 'text/plain',
        'uuid': uuid
    }
}).then(res => {
    switch (res.status) {
        case 200:
            res.json().then(data => {
                username.innerText = data.username;
                password.innerText = data.password;
                if (data?.qrcode === undefined) {
                    qrcode.innerHTML = `
                    <div class="form-group">
                        <input style="width: 35vh;" type="text" id="qrContent" placeholder="Enter a URL">
                        <button id="generate">Generate QR code</button>
                    </div>
                    `;
                    document.getElementById('generate').addEventListener('click', (e) => { if (e.isTrusted) generateQRCode(document.getElementById('qrContent').value) });
                } else {
                    //const redirectID = data.redirectID;
                    qrcode.innerHTML = `
                    <div class="form-group">
                        <span><a href="${data[data.redirectID]}" target="_blank">Destination</a></span><br>
                        <img src="${data.qrcode}"><br>
                        <button id="editQR">Edit Destination</button>
                        <button id="deleteQR">Delete QR code</button>
                    </div>
                    `;
                    document.getElementById('deleteQR').addEventListener('click', (e) => { if (e.isTrusted) deleteQRCode(uuid) });
                    document.getElementById('editQR').addEventListener('click', (e) => { if (e.isTrusted) editQRCode(uuid, prompt('Edit Destination', data[data.redirectID])) });
                }
            });
            break;
        case 401:
            localStorage.removeItem('uuid');
            window.location.href = '/account/login?unauthorized';
            break;
        case 429:
            res.text().then(data => {
                showPopup(data);
            });
            break;
        default:
            showPopup('An unknown error has occurred. You will be redirected to the login page to try again.');
            localStorage.removeItem('uuid');
            setTimeout(() => window.location.href = '/account/login', 1000);
            break;
    }
}).catch(console.error);

const generateQRCode = (content) => {
    if (content.length == 0) return showPopup('Please enter content to generate a QR code.');

    fetch(`/api/account/qrcode?content=${content}`, {
        method: "GET",
        headers: {
            'uuid': uuid
        }
    }).then(res => {
        checkStatus(res);
    }).catch(console.error);
}

const editQRCode = (uuid, newDest) => {
  fetch('/api/account/qrcode', {
    method: "PATCH",
    headers: {
      'Content-Type': 'application/json',
      'uuid': uuid
    },
    body: JSON.stringify({
      'destination': newDest
    })
  }).then(res => {
      checkStatus(res);
  }).catch(console.error);
}

const deleteQRCode = (uuid) => {
    if (confirm('Are you sure you want to delete your QR code?')) {
        fetch('/api/account/qrcode', {
            method: 'DELETE',
            headers: {
                'uuid': uuid
            }
        }).then(res => {
            checkStatus(res);
        }).catch(console.error);
    }
}

const checkStatus = (res) => {
    switch (res.status) {
        case 200:
            location.reload();
            break;
        case 204:
            location.reload();
            break;
        case 409:
            res.text().then(data => {
                showPopup(data);
            });
            break;
        case 400:
            res.text().then(data => {
                showPopup(data);
            });
            break;
        case 401:
            res.text().then(data => {
                showPopup(data);
            });
            break;
        case 429:
            res.text().then(data => {
                showPopup(data);
            });
            break;
        default:
            return 500;
    }
}

const showPopup = (msg) => {
    errorMsg.innerText = msg ?? '';
    popup.addEventListener('close', () => {
        try {
            document.getElementById('qrContent').focus();
        } catch {
            // do nothing lol
        }
    });
    popup.showModal();
}

window.onload = () => {
    logout.addEventListener('click', (e) => {
        if (e.isTrusted) {
            localStorage.removeItem('uuid');
            setTimeout(() => window.location.href = '/', 500);
        }
    });
    closeBtn.addEventListener('click', (e) => {
        if (e.isTrusted) {
            errorMsg.innerText = '';
            popup.close();
            popup.removeEventListener('close', () => console.log('modal closed'));
        }
    });
}