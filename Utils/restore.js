const { get_variable_from_state } = require("../State/store_state");


const restoreData = async () => {
    let stateData = get_variable_from_state(``);
    if (stateData) {
       
    }
};

setTimeout(() => {
    restoreData();
}, 3000);
