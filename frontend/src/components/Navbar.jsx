import { Link } from "react-scroll"

const Navbar = () => {
    return (
        <div className="flex justify-center items-center p-3 sticky top-0 z-10">
            <div className=" flex justify-between items-center w-[90%] rounded-full bg-green-400 py-2">
                <div className="text-2xl font-bold pl-5">
                    SCALARS
                </div>
                <div className=" flex justify-center items-center space-x-16 pr-5">
                    <Link 
                        to="home"
                        smooth
                        duration={400}
                        className="hover:text-white hover:underline hover:underline-offset-4 cursor-pointer duration-300 transition-all text-lg font-semibold"
                    >Home</Link>
                    <Link
                        to="model"
                        smooth
                        duration={400}
                        className="hover:text-white hover:underline hover:underline-offset-4 cursor-pointer duration-300 transition-all text-lg font-semibold"
                    >Model</Link>
                    <Link
                        to="contact"
                        smooth
                        duration={400}
                        className="hover:text-white hover:underline hover:underline-offset-4 cursor-pointer duration-300 transition-all text-lg font-semibold"
                    >Contact Us</Link>
                </div>
            </div>
        </div>
    )
}

export default Navbar