import React from 'react'
import AboutCard from './AboutCard'

const AboutPage = () => {
    return (
        <div className='h-screen w-screen bg-[#181818] flex justify-center items-center relative'>
            <div className='font-bold text-white text-5xl absolute top-[70px]'>
                About Our Team
            </div>
            <div className='flex justify-center items-center w-screen xl:space-x-10'>
                <AboutCard
                    name={'Raina Dsouza'}
                    image={require('../images/raina2.png')}
                    collegeName={'KJ Somaiya College of Engineering'}
                    course={'B.Tech Computer Engineering'}
                    linkedin={'https://www.linkedin.com/in/rainingrina/'}
                    gitlab={'https://gitlab.com/rainadsouza51'}
                    year={'Second Year'}
                />
                <AboutCard
                    name={'Saee Bachute'}
                    image={require('../images/saee.jpg')}
                    collegeName={'Dwarkadas J. Sanghvi College of Engineering'}
                    course={'B.Tech Information Technology'}
                    linkedin={'https://www.linkedin.com/in/saee-bachute/'}
                    gitlab={'https://gitlab.com/saee_b'}
                    year={'Second Year'}
                />
                <AboutCard
                    name={'Ishita Gupta'}
                    image={require('../images/ishita.jpg')}
                    collegeName={'GITAM Deemed University'}
                    course={'B.Tech Computer Engineering'}
                    linkedin={'https://www.linkedin.com/in/ishita-gupta-213348293/'}
                    gitlab={'https://gitlab.com/igupta4'}
                    year={'Second Year'}
                />
                <AboutCard
                    name={'Sania Valiyani'}
                    image={require('../images/sania.jpg')}
                    collegeName={'Dwarkadas J. Sanghvi College of Engineering'}
                    course={'B.Tech Information Technology'}
                    linkedin={'https://www.linkedin.com/in/sania-valiyani-9a714528b?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app'}
                    gitlab={'https://gitlab.com/valiyanisania25'}
                    year={'Second Year'}
                />
                <AboutCard
                    name={'Urja Tendolkar'}
                    image={require('../images/urja.jpg')}
                    collegeName={'Dwarkadas J. Sanghvi College of Engineering'}
                    course={'B.Tech Computer Engineering'}
                    linkedin={'www.linkedin.com/in/urja-tendolkar-8b4307289'}
                    gitlab={'https://gitlab.com/urjatendolkar'}
                    year={'Second Year'}
                />
            </div>
        </div>
    )
}

export default AboutPage
