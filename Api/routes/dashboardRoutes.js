import express from 'express'
import { verifyToken } from '../Midleware/authMiddleware.js'
import { getAllstat } from '../controllers/statisticsController.js'
import { getRecentActivity } from '../controllers/ActivityController.js'

const dashboardRoutes = express.Router()

dashboardRoutes.get('/statistics',verifyToken,getAllstat)
dashboardRoutes.get('/recent',verifyToken,getRecentActivity)


export default dashboardRoutes;