import React from 'react'
import { Link } from 'react-scroll'
const OptionsSrceen = () => {
    return (
        <div className='flex flex-col justify-center items-center space-y-36'>
            <Link
                to='model'
                smooth
                duration={400}
                className='px-6 py-3 rounded-full bg-gradient-to-br from-slate-100 to-green-400 text-xl font-medium cursor-pointer hover:scale-105 hover:shadow-md hover:shadow-white duration-300 transition-all'
            >
                Checkout Model
            </Link>
        </div>
    )
}

export default OptionsSrceen