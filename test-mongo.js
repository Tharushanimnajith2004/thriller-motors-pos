const mongoose = require('mongoose');

const uri = "mongodb+srv://thrillermotorspvtltd_db_user:WQ3hZKSvOZClWzTl@cluster0.lychc21.mongodb.net/thriller_motors?appName=Cluster0";

mongoose.connect(uri)
    .then(() => {
        console.log("SUCCESS");
        process.exit(0);
    })
    .catch(err => {
        console.error("FAILED:", err.message);
        process.exit(1);
    });
