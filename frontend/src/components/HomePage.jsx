import OptionsSrceen from "./OptionsSrceen"

const HomePage = () => {
    return (
        <div className="h-screen w-screen bg-[#181818] flex justify-center items-center">
            <div className="flex justify-between items-center w-[90%] h-[70%]">
                <div className="text-white text-[8rem] font-bold">
                    WELCOME<br />TO{'\t'}
                    <span className="text-green-300">
                        SCALARS
                    </span>
                </div>
                <div className="flex-1">
                    <OptionsSrceen/>
                </div>
            </div>
        </div>
    )
}

export default HomePage
