import React, { useState } from 'react'
import emailjs from '@emailjs/browser';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const ContactPage = () => {
    const [data, setData] = useState({
        from_name: '',
        from_email: '',
        to_name: 'Raina Dsouza',
        message: ''
    });

    const sendEmail = () => {
        if (data.from_email === '' || data.from_name === '' || data.message === '') {
            return;
        }

        const templateParams = {
            from_name: data.from_name,
            from_email: data.from_email,
            to_name: data.to_name,
            message: data.message
        };

        emailjs.send(
            'service_46s0qva',
            'template_7qzukum',
            templateParams,
            { publicKey: 'zaK0wnQa4P7qmJ4yK' },
        ).then((response) => {
            setData({
                from_name: '',
                from_email: '',
                to_name: 'Raina Dsouza',
                message: ''
            });
            toast.success('Your email has been sent successfully.', {
                position: 'top-right'
            });
        }).catch((error) => {
            toast.error('Some error occurred. Please try again later.', {
                position: 'top-right'
            });
        });
    }
    return (
        <div className='h-screen w-screen bg-[#181818] flex justify-center items-center relative'>
            <div className='flex flex-col justify-center items-center space-y-5 bg-slate-300 w-[500px] h-[500px] rounded-xl shadow-lg shadow-green-300'>
                <div className='text-3xl text-black'>Get in Touch</div>
                <input
                    className='outline-none bg-green-400 w-[400px] h-[50px] rounded-xl'
                    type='text'
                    value={data.from_name}
                    placeholder='Your Name'
                    style={{
                        textAlign: 'center'
                    }}
                    onChange={(e) => {
                        e.preventDefault();
                        setData({
                            ...data,
                            from_name: e.target.value
                        })
                    }}
                />
                <input
                    className='outline-none bg-green-400 w-[400px] h-[50px] rounded-xl'
                    type='text'
                    value={data.from_email}
                    style={{
                        textAlign: 'center'
                    }}
                    placeholder='Your Email'
                    onChange={(e) => {
                        e.preventDefault();
                        setData({
                            ...data,
                            from_email: e.target.value
                        })
                    }}
                />
                <textarea
                    rows={30}
                    className='outline-none bg-green-400 w-[400px] h-[50px] rounded-xl min-h-[200px]'
                    type='text'
                    style={{
                        textAlign: 'center'
                    }}
                    value={data.message}
                    placeholder='Your Message'
                    onChange={(e) => {
                        e.preventDefault();
                        setData({
                            ...data,
                            message: e.target.value
                        })
                    }}
                />
                <div
                    onClick={sendEmail}
                    className='px-4 py-1 rounded-full bg-gradient-to-br from-slate-100 to-green-400 text-lg cursor-pointer hover:shadow-md hover:shadow-white duration-300 transition-all '
                >
                    Send Email
                </div>
            </div>
        </div>
    )
}

export default ContactPage