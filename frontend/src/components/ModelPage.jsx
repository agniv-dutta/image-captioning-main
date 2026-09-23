import React, { useState } from 'react'
import axios from 'axios';
const ModelPage = () => {
    const [fileData, setFileData] = useState(null);
    const [predicton, setPrediction] = useState('Please upload an image first.');

    const handleFileChange = (e) => {
        setFileData(e.target.files[0]);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!fileData) return;

        const formData = new FormData();
        formData.append('file', fileData);

        try {
            const response = await axios.post('http://127.0.0.1:5000/predict', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setPrediction(response.data.result);
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    };
    return (
        <div className='h-screen w-screen flex justify-center items-center relative'>
            <div className='absolute top-[80px] text-white font-medium text-lg'> How to use : Upload an image and click the submit button to get a small description of the image.</div>
            <div className='w-screen h-[80%] flex justify-center items-center'>
                <form onSubmit={handleSubmit} className='flex-1 flex m-5 flex-col justify-center  h-[75%] items-center bg-gray-500/10 rounded-2xl space-y-10'>
                    <input type="file" onChange={handleFileChange} />
                    <button
                        type='submit'
                        className='px-4 py-2 rounded-full bg-gradient-to-br from-slate-100 to-green-400 text-xl font-medium cursor-pointer hover:shadow-md hover:shadow-green-300 duration-300 transition-all'
                    >Submit</button>
                </form>
                <div className='flex-1 m-5 flex justify-center items-center h-[75%] rounded-2xl bg-green-300 font-medium text-[2.5rem]'>
                    Your prediciton is : <br />{predicton}
                </div>
            </div>
        </div>
    )
}

export default ModelPage
