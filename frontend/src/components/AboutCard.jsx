import React from 'react'
import Tilt from 'react-parallax-tilt';
import { FaLinkedin } from "react-icons/fa";
import { FaGitlab } from "react-icons/fa";
const AboutCard = ({
    name,
    image,
    collegeName,
    course,
    year,
    linkedin,
    gitlab,
}) => {
    return (
        <Tilt
            className=' cursor-default flex justify-center items-center flex-col bg-green-300 rounded-xl p-5 h-[380px] w-[220px] hover:shadow-xl hover:shadow-white'
        >
            <div className='rounded-2xl overflow-hidden'>
                <img
                    src={image}
                    alt="image"
                    className='object-cover h-[150px] w-[150px]'
                />
            </div>
            <div className=' flex flex-col space-y-3'>
                <h1 className='text-xl font-bold'>{name}</h1>
                <p className='text-sm font-semibold'>{collegeName}</p>
                <p className='text-sm font-semibold'>{course}</p>
                <p className='text-sm font-semibold'>{year}</p>
                <div className='flex justify-evenly items-center w-full '>
                    <a href={linkedin} target="_blank" rel="noreferrer">
                        <FaLinkedin size={35} color='#181818' />
                    </a>
                    <a href={gitlab} target="_blank" rel="noreferrer">
                        <FaGitlab size={35} color='#181818' />
                    </a>
                </div>
            </div>
        </Tilt>
    )
}

export default AboutCard