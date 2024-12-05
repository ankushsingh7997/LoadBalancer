const { get_current_date_time } = require("./time");
const axios = require("axios");
const { NOTIFY_TELEGRAM_TOKEN, NOTIFY_TELEGRAM_CHAT_ID } = require("../Env/env");

exports.send_notification = async (message) => {
    // const url = `https://api.telegram.org/bot${NOTIFY_TELEGRAM_TOKEN}/sendMessage`;

    // const payload = {
    //     chat_id: NOTIFY_TELEGRAM_CHAT_ID,
    //     text: `*${message}*\n\n_${get_current_date_time()}_ `,
    //     parse_mode: "Markdown",
    // };

    // try {
    //     const response = await axios.post(url, payload);
    //     if (!response.data.ok) {
    //         console.error(`${get_current_date_time()} | ERROR | Failed to send message: ${response.data.description}`);
    //     }
    // } catch (error) {
    //     console.error(`${get_current_date_time()} | ERROR | Error sending message to Telegram:`, error);
    // }
    console.log(message);
};
