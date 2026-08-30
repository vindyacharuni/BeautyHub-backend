import mongoose from 'mongoose';
const userSchema=new mongoose.Schema(
    {
        firstName:{
            type:String,
            required:true
        }
        ,lastName:{
            type:String,
            required:true
        }
        ,email:{
            type:String,
            required:true,
            unique:true
        }
        ,password:{
            type:String,
            required:true
        }
        ,phone:{
            type:String,
            default:"Not provided"
        
        }
        ,isBlocked:{
            type:Boolean,
            default:false
        }
        ,role:{
            type:String,
            default:"user",

        }
        ,profilePicture:{
            type:String,
            default:"https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png"
        }
        ,isemailVerified:{
            type:Boolean,
            default:false
        }
        ,otp:{
            type:String
        }
        ,otpExpiry:{
            type:Date
        }
    }
)
const User=mongoose.model("users",userSchema)
export default User;