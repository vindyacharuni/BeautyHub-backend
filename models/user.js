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
        ,failedLoginAttempts:{
            type:Number,
            default:0
        }
        ,lockUntil:{
            type:Date
        }
    }
);

userSchema.set('toJSON', {
    transform: function(doc, ret) {
        delete ret.password;
        delete ret.otp;
        delete ret.otpExpiry;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        return ret;
    }
});

userSchema.set('toObject', {
    transform: function(doc, ret) {
        delete ret.password;
        delete ret.otp;
        delete ret.otpExpiry;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        return ret;
    }
});

const User=mongoose.model("users",userSchema);
export default User;