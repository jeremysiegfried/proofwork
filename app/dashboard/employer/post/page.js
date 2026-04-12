import { Suspense } from 'react' 
import PostJobContent from './PostJobContent' 
export default function PostJobPage() { 
  return ( 
    <Suspense fallback={<div>Loading...</div>}> 
      <PostJobContent /> 
    </Suspense> 
  ) 
} 
