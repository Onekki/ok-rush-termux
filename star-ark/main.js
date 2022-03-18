const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const axios = require('axios')
const inquirer = require('inquirer')

const config = JSON.parse(fs.readFileSync('config.json'))

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(() => resolve(), ms))
}

const request = async (options) => {
    try {
        const response = await axios.request(options)
        const code = response.data.code
        if ([1].includes(code)) {
            console.log(response.data)
            return response.data
        }
        console.log(JSON.stringify(response.data))
    } catch (e) { 
        console.log(e.message)
    }
    await sleep(100)
    return await request(options)
}

const downloadFile = async (url, name) => {
    try {
        const response = await axios.request({
            method: "GET",
            url: url,
            headers: config.headers,
            responseType: "stream",
        });
        if ([200].includes(response.status)) {
            const writer = fs.createWriteStream(name);
            response.data.pipe(writer);
            return await new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
            });
        }
    } catch (e) {
        console.log(e.message)
    }
    return await downloadFile(url, name)
}

const start = async () => {

    const captchaFileName = "captcha.png"
    await downloadFile("https://h5.stararknft.art//api/VerifyCode/captcha", captchaFileName)
    try {
        cp.execSync('code ' + path.join(__dirname, './' + captchaFileName))
    } catch (e) {
        console.log("code:image:" + captchaFileName)
    }

    const answers = await inquirer.prompt([{
        type: 'input',
        name: 'name',
        message: '请输入验证码:'
    }])

    const captcha = answers.name

    let data = await request({
        url: 'https://h5.stararknft.art/api/Box/detailed',
        method: 'POST',
        headers: config.headers,
        data: 'id=' + config.id + '&uid=' + config.uid
    })

    const { token_id, price} = data.data.info

    data = await request({
        url: 'https://h5.stararknft.art/api/Pay/before_buy_box',
        method: 'POST',
        headers: config.headers,
        data: 'id=' + config.id +'&uid=' + config.uid + '&token_id=' + token_id
    })

    await request({
        url: 'https://h5.stararknft.art/api/Pay/direct_buy_box',
        method: 'POST',
        headers: config.headers,
        data: 'id='+ config.id + 
                '&uid=' + config.uid + 
                '&money=' + price + 
                '&token_id='+ token_id + 
                '&password=' + config.password +
                '&captcha=' + captcha
    })
}

const repeatStart = async () => {
    for (let i = 0; i < 1; i++) {
        await start()
    }
}

repeatStart()
