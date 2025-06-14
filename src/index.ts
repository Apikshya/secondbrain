import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { UserModel, ContentModel, LinkModel } from "./db";
import { JWT_PASSWORD } from "./config";
import { userMiddleware } from "./middleware";
import { random } from "./utils";
// secrets.js-gremps :returns a secure, random hex string for cryptographic use :"e54jt45tj3j5tk3.."(secure hex)
// ./utils.js        :returns a simple random number                             :"y3u3h2j3k4"(depends upon the type of function we created)
// import { ramdon } from "./utils.js"



//yo link ra password haru lai .env ma rakhne + .env lai gitignore ma
mongoose.connect("mongodb+srv://apikshyashrestha:6AVfH3ooeC3zOGTA@cluster0.p2px6.mongodb.net/brainly")
.then(() => {
    console.log('MongoDB Connected successfully');
})
.catch((err) => {
    console.error('MongoDB connection error:', err);
})


const app = express();
app.use(express.json());

app.post("/api/v1/signup", async (req, res) =>{
    // to do: zod validation , hash the password
    // if user exist return 401 .. testaii 
    const username = req.body.username;
    const password = req.body.password;

    try{
        await UserModel.create({
        username : username,
        password: password
    })

    res.json({
        message: "User signed up"
    })
    } catch(e) {
        res.status(411).json({
            message:"User already exist"
        })
    }
    
})

app.post("/api/v1/signin", async(req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const existingUser = await UserModel.findOne({
        username,
        password
    })
    if(existingUser) {
        const token = jwt.sign({
            id: existingUser._id
        }, JWT_PASSWORD)

        res.json({
            token
        })
    } else {
        res.status(403).json({
            message: "Incorrect Credentials"
        })
    }

})

app.post("/api/v1/content",userMiddleware, (req, res) =>{
    const link = req.body.link;
    const type = req.body.type;

    ContentModel.create({
        link,
        type,
        //@ts-ignore
        userId: req.userId,
        tags:[]
    })

    res.json({
        message: "Content added"
    })
})

app.get("/api/v1/content",userMiddleware, async (req, res) => {

    const userId = req.userId;
    const content = await ContentModel.find({
        userId : userId
    }).populate("userId", "username")

    res.json({
        content
    })
})

//if the content with the given contentId donot exist show error message
app.delete("/api/v1/content", userMiddleware, async (req, res)=>{
    const contentId = req.body.contentId;
   const deleteResult = await ContentModel.deleteMany({
    _id: contentId,
    userId: req.userId
});
console.log("Delete Result:", deleteResult); // Check deletedCount

    res.json({
        message: "content deleted"
    })
})

app.post("/api/v1/brain/share", userMiddleware,async(req, res) =>{
    const share = req.body.share;
    if (share) {
        const existingLink = await LinkModel.findOne({//find - findOne is hashing only 1 content at a time -hash is given to specific userId and this is going wrong here
            userId: req.userId
        });

        if(existingLink){
            res.json({
                hash: existingLink.hash
            })
            return; 
        }

        const hash = random(10);
        await LinkModel.create({
            userId: req.userId ,
            hash: hash,
        })

        res.json({
            hash
        })
    } else {
        await LinkModel.deleteOne({
            userId: req.userId
        });

        res.json({
        message: "Removed Link"
    })
    }
})

app.post("/api/v1/brain/:shareLink", async(req, res) => {
    const hash = req.params.shareLink;

    const link = await LinkModel.findOne({
        hash
    });

    if(!link) {
        res.status(411).json({
            message: "Sorry incorrect input"
        })
        return; //stops execution
    } 

    //userId
    const content = await ContentModel.find({
        userId: link.userId
    })

    const user = await UserModel.find({
        _id: link.userId
    })

    if(!user){
        res.status(411).json({
            message: "user not found, error should ideally not happen "
        })
    }
// @ts-ignore
    if(user.username){
        console.log("username exists");
    } else {
        console.log("username donot exist");
    }

    console.log(user);

    res.json({
        // @ts-ignore //we should not do this but anyway 
        username: user.username,
        content: content
    })

})

app.listen(3000);
