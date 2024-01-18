require("dotenv").config()
const express = require("express")
const cors = require("cors")
const axios = require("axios")
const jwt = require("jsonwebtoken")
const {Sequelize, DataTypes, HasMany} = require("sequelize")
const sequelize = new Sequelize("task_manager", "admin", "KeepPunching198862!",{
    host:"tmdb.cecvtdbomv9x.us-east-1.rds.amazonaws.com",
    port:"3306",
    dialect:"mysql"
    })
const app= express()
app.use(express.json())
app.use(cors())


//Global arrays
//allUsers and allPosts are global arrays of objects which will be updated and sent to the front-end with every CRUD-REQUEST
let allUsersGlobal = []
let allTasksGlobal =[]
let isAuthenticated = false

// WORKING WITH THE DATABASE

//CREATE A USER MODEL
const User = sequelize.define('users',
{
    user_id:{type:DataTypes.INTEGER, allowNull:false, primaryKey:true, autoIncrement:true},

    username:{type:DataTypes.STRING, allowNull:false},
    password:{type:DataTypes.STRING, allowNull:false}
},{autoIncrement:true, freezeTableName:true, timestamps:false})
//------------------------------------------//



//CREATE A TASK MODEL
const Task = sequelize.define('tasks', {
title:{type:DataTypes.STRING, allowNull:false},
description:{type:DataTypes.STRING, allowNull:false},
category:{type:DataTypes.STRING, allowNull:false},
priority:{type:DataTypes.INTEGER, allowNull:false},
progress:{type:DataTypes.INTEGER, allowNull:false},
status:{type:DataTypes.STRING, allowNull:false}    
}, {timestamps:false, autoIncrement:true,freezeTableName:true})
//-------------------------------------------//
//CREATE ASSOCIACIONS
async function createAssociations()
{
    User.hasMany(Task)
    Task.belongsTo(User)
    await sequelize.sync({alter:true})
    console.log("Associations created successfully")
    
}

//--------------------------------------------//



//CREATE  A USER INSTANCE
//--------------------------------------------//
async function createUserInstance(username, password)
{
    await User.sync({alter:true})
    const newUser = await User.create(
        {username:username,
        password:password}
    )
}
//CREATE A TASK INSTANCE
//--------------------------------------------//
async function createTask(title, description, priority, progress)
{
await Task.sync({alter:true})
const newTask = await Task.create(
    {
        title:title,
        description: description, priority:priority, progress:progress
    }
)
}

//---------------------helper functions

//GET ALL USERS
async function getAllUsers()
{
    await sequelize.sync()    
allUsersGlobal =[]
let allUsersLocal =  await User.findAll()
allUsersLocal.forEach(user=>{allUsersGlobal.push(user.toJSON())})
console.log(allUsersGlobal)
}


//GET ALL TASKS
async function getAllTasks()
{
allTasksGlobal = []
await sequelize.sync()
let allTasksLocal = await Task.findAll()
;(await allTasksLocal).forEach(task=>{allTasksGlobal.push(task.toJSON())})
}

//delete a target task
async function deleteTask()
{

}
//find a matching profile
async function findMatchingProfile(username, password)
{
let matchingProfile =[]
let currentUserObject = {username:username, password:password}
for (let i=0; i<allUsersGlobal.length;i++)
{
if((allUsersGlobal[i].username==currentUserObject.username)&&(allUsersGlobal[i].password==currentUserObject.password))
{
matchingProfile.push(currentUserObject)    
}    
}
return(matchingProfile[0])
}

//find all tasks of a specific user

async function getUserTasks(username)
{
await sequelize.sync({alter:true})
let targetUser = await User.findOne({where:{username:username}})
let targetUserObject = await targetUser.toJSON()
let targetUserID = targetUserObject.user_id
console.log(`targetUser ID: ${targetUserID}`)
}

async function deleteTask(taskId)
{
    await Task.sync({alter:true})
    await Task.destroy({where:{id:taskId}})

}



//server endpoints
app.get("/allUsers", async(req,res)=>{
    try

    {await getAllUsers()
        console.log('Get all users request received')
        res.status(200).send(allUsersGlobal)}
    catch
    {res.status(500).send("Failed to send all users to the front end")}
})

app.get("/allTasks", async(req,res)=>{
    try
    {
        console.log('Get all tasks request received')
        await getAllTasks()
        res.status(200).send(allTasksGlobal)
    }
    catch
    {res.status(500).send("Failed to send all tasks to the front end")}
})



app.post('/register', async(req,res)=>{
    try{
    let username = await req.body.username
    let password = await req.body.password
    await createUserInstance(username, password)
    await getAllUsers()    
        res.status(200).send("Registration request completed")        
    }
    catch{res.status(500).send("Could not register a new user")}
})


//Login
//fronend will send the user's credentials. The first thing we need to do on the server-side is make sure that there is actually an account in the DB. If there is one, we generate a JWT-access token and send it back to the frontend.




app.post('/login', async(req,res)=>{
    try{
    let currentUsername = await req.body.username
    let currentPassword = await req.body.password
    let currentUserData = {username:currentUsername, password:currentPassword}
    await getAllUsers()
    let matchingProfileFound = false
let MPF = await findMatchingProfile(currentUsername, currentPassword)
if (MPF) {matchingProfileFound =true}
else{matchingProfileFound = false}
const accessToken = jwt.sign(currentUserData, process.env.ACCESS_TOKEN_SECRET)
const response = {accessToken:accessToken, MPF:matchingProfileFound}
    res.status(200).send(response)
    }
    catch{
        res.status(500).end("Failed to complete a login request")
    }
})

//token authenication middleware

function authenticateToken(req,res,next)
{
let authorization = req.headers['authorization']
let token = authorization.split(' ')[1]    
jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(error,user)=>{
if(error){isAuthenticated = false}
else{
    isAuthenticated = true
  req.user = user
    next()
}    
})

}



app.get('/login', authenticateToken,(req,res)=>{
    try{
let loginData={
    username:req.user.username,
    password: req.user.password,
    isAuthenticated:isAuthenticated
}
console.log(loginData)
res.status(200).send(loginData)               
    }
    catch{res.status(500).send("Server error")}
    
})


app.post('/newtask', async(req,res)=>{
    try{
        const taskTitle = await req.body.title
        const taskDescription = await req.body.description
        const taskCategory = await req.body.category
        const taskPriority = await req.body.priority
        const taskProgress = await req.body.progress
        const TaskStatus = await req.body.status
        const username = await req.body.username
await sequelize.sync({alter:true})
let targetUser = await User.findOne({where: 
{username:username}})        
let targetUserObject = await targetUser.toJSON()
await targetUser.createTask({
    title:taskTitle,
    description:taskDescription,
    category:taskCategory,
    priority: taskPriority,
    progress:taskProgress,
    status: TaskStatus
})

const newTask ={
    title:taskTitle,
    description:taskDescription,
    category:taskCategory,
    priority: taskPriority,
    progress:taskProgress,
    status: TaskStatus    
}
console.log(newTask)
res.status(200).send("Request to create a new task has been received")
    }
    catch{res.status(500).send("Error")}
})


app.post('/deleteTask', async(req, res)=>
{
    try{
    let taskId = await req.body.Id
    await deleteTask(taskId)
    await getAllTasks()
    
    
        res.status(200).send(`Deleted task with the id of : ${taskId}`)}
    
    
        catch{res.status(500).send('Error')}
})

app.put('/updateTask', async(req,res)=>{
    try{
        let taskId = await req.body.id
        let taskTitle = await req.body.title
        let taskDescription = await req.body.description
        let taskCategory = await req.body.category
        let taskPriority = await req.body.priority
        let taskProgress = await req.body.progress
        let TaskStatus = await req.body.status
        let targetTask = await Task.findOne({where:{id: taskId}})
        targetTask.title = taskTitle
        targetTask.description = taskDescription
        targetTask.category = taskCategory
        targetTask.priority = taskPriority
        targetTask.progress = taskProgress
        targetTask.status = TaskStatus
        await targetTask.save()
        await getAllTasks()

        res.status(200).send('update task request received')
    }
    
    
    
    
    
    catch{res.status(500).send('Error')}
})

createAssociations()
app.listen(8000, ()=>{console.log('Server jamming on port 8000')})

