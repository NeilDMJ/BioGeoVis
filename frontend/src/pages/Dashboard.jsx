import './Dashboard.css';
import Navbar  from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const Dashboard = () => {
    return(
        <div className="dashboard">
            <Navbar />
            <Sidebar />
        </div>
    )
}

export default Dashboard;
