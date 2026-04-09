const User = require('../models/User');
const Booking = require('../models/Booking');

// Build and send JWT in cookie + body
const sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true,
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token
    });
};


//register
exports.register = async (req,res,next) => {
    try{
        const {name,tel,email,password,role} = req.body;

        if(!name || !tel || !email || !password){
            return res.status(400).json({
                success:false,
                msg:'Please provide name, tel, email and password'
            });
        }

        //create user
        const user = await User.create({
            name,
            tel,
            email,
            password,
            role
        });

        //token
        sendTokenResponse(user, 200, res);


    }catch(err){

        console.log(err.stack);
        res.status(400).json({
            success:false,
            msg:'Cannot register user'
        });

    }
};


//login
exports.login = async (req,res,next) => {

    try{
        // Check if user is already logged in via cookie
        if (req.cookies.token) {
            return res.status(400).json({
                success: false,
                msg: 'You are already logged in. Please logout first.'
            });
        }

        const {email,password} = req.body;

        //valid email,password
        if(!email || !password){
            return res.status(400).json({
                success:false,
                msg:'Please provide an email and password'
            });
        }

        //check user
        const user = await User.findOne({email}).select(`+password`);
        if(!user){
            return res.status(400).json({
                success:false,
                msg: 'Invalid credentials'});
        }

        //match password

        const isMatch = await user.matchPassword(password);

        if(!isMatch){
            return res.status(401).json({
                success:false,
                msg:'Invalid credentials'
            });
        }

        //token
        sendTokenResponse(user, 200, res);

    }catch(err){

        console.log(err.stack);
        return res.status(500).json({
            success:false,
            msg:'Cannot convert email or password to string'
        });
    }
}


//Get me
exports.getMe = async (req,res,next) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        success:true,
        data:user
    });
};

//logout
exports.logout = async (req,res,next) => {
    res.cookie('token','',{
        expires: new Date(Date.now() + 10*1000),
        httpOnly: true
    });
    res.status(200).json({
        success:true,
        data:{}
    });
};

//changepassword
//req body มีแค่ currentpassword กับ newpassword
//ex.
// {
//   "currentPassword": "xxx",
//   "newPassword": "yyy"
// }
exports.changePassword = async (req, res, next) => {
    try {
        
        const{ currentPassword , newPassword } = req.body

        //isEnterbody?
        if(!currentPassword || !newPassword){
            return res.status(400).json({
                success: false,
                message: 'Please enter your Current Password and New Password '
            });
        }

        //find user
        const user = await User.findById(req.user.id).select('+password');

        //checkmatchcurrentpassword
        const isMatch = await user.matchPassword(currentPassword);
        if(!isMatch){
            return res.status(400).json({
                success: false,
                msg: 'Current Password incorrect'
            });
        }

        //setnewpassword
        user.password = newPassword;
        await user.save();

        return sendTokenResponse(user, 200, res);

    } catch (err) {
        console.log(err.stack);
        res.status(500).json({
            success: false,
            message: 'Cannot change password'
        });
    }
};

// @desc    Delete user and their bookings
// @route   /api/v1/auth/delete
// @access  Private
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                msg: `No user with id of ${req.params.id}`
            });
        }

        await Booking.deleteMany({ user: req.params.id });

        await user.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        console.log(err.stack);
        res.status(400).json({
            success: false,
            msg: 'Cannot delete user'
        });
    }
}