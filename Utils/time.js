const pad = (num, size) => {
    let s = num.toString();
    while (s.length < size) s = "0" + s;
    return s;
};
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

exports.get_current_date_time = () => {
    let now = new Date();
    const day = pad(now.getDate(), 2);
    const month = months[pad(now.getMonth())].toUpperCase();
    const year = now.getFullYear();

    const hours = pad(now.getHours(), 2);
    const minutes = pad(now.getMinutes(), 2);
    const seconds = pad(now.getSeconds(), 2);
    const milliseconds = pad(now.getMilliseconds(), 3);
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}:${milliseconds}`;
};

exports.get_current_date = () => {
    let now = new Date();
    const day = pad(now.getDate(), 2);
    const month = pad(now.getMonth() + 1, 2); // Add 1 to the month
    const year = now.getFullYear();
    return `${year}-${month}-${day}`;
};

exports.get_current_time = () => {
    let now = new Date();
    const hours = pad(now.getHours(), 2);
    const minutes = pad(now.getMinutes(), 2);
    const seconds = pad(now.getSeconds(), 2);
    const milliseconds = pad(now.getMilliseconds(), 3);
    return `${hours}:${minutes}:${seconds}:${milliseconds}`;
};
