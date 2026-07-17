package com.autocare.backend.repository;

import com.autocare.backend.entity.ServiceRequest;
import com.autocare.backend.entity.ServiceStatus;
import com.autocare.backend.entity.User;
import com.autocare.backend.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {

    List<ServiceRequest> findByVehicle(Vehicle vehicle);

    List<ServiceRequest> findByEmployee(User employee);

    List<ServiceRequest> findByEmployee_IdAndStatusNot(
            Long employeeId,
            ServiceStatus status);

    List<ServiceRequest> findByStatus(ServiceStatus status);

    List<ServiceRequest> findByVehicle_Owner_Id(Long customerId);

    List<ServiceRequest> findByEmployeeIsNull();

}