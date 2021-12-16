const uuid = localStorage['uuid'];
const username = document.getElementById('username');
const password = document.getElementById('password');
const qrcode = document.getElementById('qr-code');
const logout = document.getElementById('logout');

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
                    document.getElementById('generate').addEventListener('click', () => generateQRCode(document.getElementById('qrContent').value));
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
                    document.getElementById('deleteQR').addEventListener('click', () => deleteQRCode(uuid));
                    document.getElementById('editQR').addEventListener('click', () => editQRCode(uuid, prompt('Edit Destination', data[data.redirectID])));
                }
            });
            break;
        case 401:
            window.location.href = '/account/login?unauthorized';
            break;
        default:
            alert('An unknown error has occurred. You will be redirected to the login page to try again.');
            localStorage.removeItem('uuid');
            setTimeout(() => window.location.href = '/account/login', 1000);
            break;
    }
}).catch(console.error);

const generateQRCode = (content) => {
    if (content.length == 0) return alert('Please enter content to generate a QR code.');

    fetch(`/api/account/qrcode?content=${content}`, {
        method: "GET",
        headers: {
            'uuid': uuid
        }
    }).then(res => {
        switch (res.status) {
            case 200:
                location.reload();
                break;
            case 409:
                res.text().then(data => {
                    return data;
                });
                break;
            case 400:
                res.text().then(data => {
                    return data;
                });
                break;
            case 401:
                res.text().then(data => {
                    return data;
                });
                break;
            default:
                return 500;
        }
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
    switch (res.status) {
      case 204:
          location.reload();
          break;
      case 401:
          res.text().then(data => {
              alert(data);
          });
          break;
      default:
           return 500;
    }
  }).catch(console.error);
}

const deleteQRCode = (uuid) => {
    fetch('/api/account/qrcode', {
        method: 'DELETE',
        headers: {
            'uuid': uuid
        }
    }).then(res => {
        switch (res.status) {
            case 204:
                location.reload();
                break;
            case 401:
                res.text().then(data => {
                    return data;
                });
                break;
            default:
                return 500;
        }
    }).catch(console.error);
}

window.onload = () => {
    logout.addEventListener('click', (e) => {
        if (e.isTrusted) {
            localStorage.removeItem('uuid');
            setTimeout(() => window.location.href = '/', 500);
        }
    });
}